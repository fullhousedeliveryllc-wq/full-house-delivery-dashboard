// Square -> dashboard bridge.
//
// The Square access token must never reach the browser, so the dashboard calls
// this function with the signed-in user's Supabase JWT and the function calls
// Square with the token stored in the SQUARE_ACCESS_TOKEN secret.
//
// Deploy:
//   supabase secrets set SQUARE_ACCESS_TOKEN=... [SQUARE_LOCATION_ID=...] [SQUARE_ENV=production]
//   supabase functions deploy square-sync

const SQUARE_VERSION = '2025-01-23';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface SquareMoney {
    amount?: number;
    currency?: string;
}

interface SquarePayment {
    id: string;
    created_at: string;
    status: string;
    amount_money?: SquareMoney;
    tip_money?: SquareMoney;
    refunded_money?: SquareMoney;
    processing_fee?: { amount_money?: SquareMoney }[];
    note?: string;
    receipt_number?: string;
    source_type?: string;
    card_details?: { card?: { card_brand?: string; last_4?: string } };
}

interface SquareRefund {
    id: string;
    created_at: string;
    status: string;
    amount_money?: SquareMoney;
    reason?: string;
    payment_id?: string;
}

interface Transaction {
    extId: string;
    date: string;
    type: string;
    amount: number;
    description: string;
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

function dollars(money?: SquareMoney): number {
    return (money?.amount ?? 0) / 100;
}

function dateOnly(iso: string): string {
    return iso.slice(0, 10);
}

function squareBase(): string {
    return Deno.env.get('SQUARE_ENV') === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';
}

async function squareGet(path: string, token: string): Promise<Record<string, unknown>> {
    const res = await fetch(squareBase() + path, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Square-Version': SQUARE_VERSION,
            'Content-Type': 'application/json'
        }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = Array.isArray(body?.errors) && body.errors[0]?.detail
            ? body.errors[0].detail
            : res.statusText;
        throw new Error('Square API ' + res.status + ': ' + detail);
    }
    return body;
}

// Square paginates with an opaque cursor; cap the pages so one sync can't run away.
async function squarePaged<T>(path: string, token: string, key: string, maxPages = 20): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
        const url = path + (cursor ? (path.includes('?') ? '&' : '?') + 'cursor=' + encodeURIComponent(cursor) : '');
        const body = await squareGet(url, token);
        const items = (body[key] as T[]) || [];
        out.push(...items);
        cursor = body.cursor as string | undefined;
        if (!cursor) break;
    }
    return out;
}

function paymentToTransactions(p: SquarePayment): Transaction[] {
    const gross = dollars(p.amount_money) + dollars(p.tip_money);
    if (gross <= 0) return [];

    const card = p.card_details?.card;
    const label = p.note
        || (card ? (card.card_brand || 'Card') + ' \u2022\u2022\u2022\u2022' + (card.last_4 || '') : (p.source_type || 'Square payment'));
    const rows: Transaction[] = [{
        extId: p.id,
        date: dateOnly(p.created_at),
        type: 'Payment Received',
        amount: gross,
        description: label + (p.receipt_number ? ' #' + p.receipt_number : '')
    }];

    // Square reports fees on the payment, not as separate transactions, so the
    // deposits stay gross and the fee is logged alongside them.
    const fee = (p.processing_fee || []).reduce((s, f) => s + dollars(f.amount_money), 0);
    if (fee > 0) {
        rows.push({
            extId: p.id + ':fee',
            date: dateOnly(p.created_at),
            type: 'Fee',
            amount: fee,
            description: 'Square processing fee' + (p.receipt_number ? ' #' + p.receipt_number : '')
        });
    }
    return rows;
}

function refundToTransaction(r: SquareRefund): Transaction | null {
    const amount = dollars(r.amount_money);
    if (amount <= 0) return null;
    return {
        extId: r.id,
        date: dateOnly(r.created_at),
        type: 'Withdrawal',
        amount: amount,
        description: 'Square refund' + (r.reason ? ' \u2014 ' + r.reason : '')
    };
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

    // Supabase verifies the JWT before invoking, so a caller here is signed in.
    if (!req.headers.get('Authorization')) return json({ error: 'Sign in to sync Square.' }, 401);

    const token = Deno.env.get('SQUARE_ACCESS_TOKEN');
    if (!token) {
        return json({ error: 'SQUARE_ACCESS_TOKEN is not set on this Supabase project.' }, 500);
    }

    let days = 90;
    try {
        const body = await req.json();
        if (body && Number.isFinite(body.days)) days = Math.min(Math.max(1, body.days), 730);
    } catch (_) { /* default window */ }

    const beginTime = new Date(Date.now() - days * 86400000).toISOString();
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    const locationParam = locationId ? '&location_id=' + encodeURIComponent(locationId) : '';

    try {
        const payments = await squarePaged<SquarePayment>(
            '/v2/payments?limit=100&sort_order=DESC&begin_time=' + encodeURIComponent(beginTime) + locationParam,
            token,
            'payments'
        );
        const refunds = await squarePaged<SquareRefund>(
            '/v2/refunds?limit=100&sort_order=DESC&begin_time=' + encodeURIComponent(beginTime) + locationParam,
            token,
            'refunds'
        );

        const transactions: Transaction[] = [];
        payments
            .filter((p) => p.status === 'COMPLETED')
            .forEach((p) => transactions.push(...paymentToTransactions(p)));
        refunds
            .filter((r) => r.status === 'COMPLETED')
            .forEach((r) => {
                const t = refundToTransaction(r);
                if (t) transactions.push(t);
            });

        return json({
            transactions: transactions,
            since: dateOnly(beginTime),
            syncedAt: new Date().toISOString(),
            environment: Deno.env.get('SQUARE_ENV') === 'sandbox' ? 'sandbox' : 'production'
        });
    } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 502);
    }
});
