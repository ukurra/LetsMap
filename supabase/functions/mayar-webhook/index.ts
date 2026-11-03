// Ukurra — webhook Mayar.id (aktivasi Pro otomatis setelah pembayaran)
//
// Mayar TIDAK mendokumentasikan tanda tangan/HMAC untuk membuktikan
// request ini benar dari Mayar (dicek di docs.mayar.id/integration/webhook,
// Nov 2026). Sebagai gantinya, URL function ini sendiri berisi token
// rahasia (?secret=...) yang hanya diketahui kita dan ditempel di
// dashboard Mayar — itulah pembuktian keasliannya di sini.
//
// Nama field payload tidak konsisten antar halaman dokumentasi Mayar
// (ada yang bilang data.status itu Boolean, ada yang contoh nilainya
// string "SUCCESS" + field terpisah data.transactionStatus). Kode ini
// menerima kemungkinan keduanya, dan payload mentahnya selalu dicatat
// ke log supaya bisa dicocokkan ke kondisi nyata saat uji coba pertama.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SECRET = Deno.env.get('MAYAR_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Rp 599.000/tahun dan Rp 69.000/bulan — lihat assets/js/upgrade.js.
// Dipetakan dari NOMINAL, bukan nama/ID produk, supaya tidak perlu
// disinkronkan ulang kalau nama produk di Mayar diubah nanti.
const PAKET: Record<number, { hari: number; label: string }> = {
  599000: { hari: 365, label: 'tahunan' },
  69000: { hari: 30, label: 'bulanan' },
};

function cocokAman(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('secret') ?? '';
  if (!SECRET || !cocokAman(token, SECRET)) {
    console.error('[mayar-webhook] token salah/kosong, request ditolak');
    return new Response('Forbidden', { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Selalu dicatat dulu, apa pun isinya — ini sumber kebenaran untuk
  // mencocokkan nama field asli Mayar saat uji coba pertama kali.
  console.log('[mayar-webhook] payload mentah:', JSON.stringify(body));

  const event = body?.event;
  const data = body?.data ?? {};

  if (event !== 'payment.received') {
    console.log('[mayar-webhook] event diabaikan:', event);
    return new Response('ok (ignored)', { status: 200 });
  }

  const statusSukses =
    data.status === true ||
    data.status === 'SUCCESS' ||
    data.transactionStatus === 'paid' ||
    data.transactionStatus === 'success';

  if (!statusSukses) {
    console.log('[mayar-webhook] status belum sukses, diabaikan:', data.status, data.transactionStatus);
    return new Response('ok (not paid)', { status: 200 });
  }

  const email = (data.customerEmail ?? '').trim().toLowerCase();
  const amount = Number(data.amount);
  const webhookId = String(data.id ?? '');

  if (!email || !amount || !webhookId) {
    console.error('[mayar-webhook] payload tidak lengkap:', { email, amount, webhookId });
    return new Response('ok (incomplete, logged)', { status: 200 });
  }

  const paket = PAKET[amount];
  if (!paket) {
    console.error('[mayar-webhook] nominal tidak dikenali, bukan produk Ukurra Standard:', amount);
    return new Response('ok (unknown amount)', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Anti dobel-aktivasi kalau Mayar mengirim webhook yang sama lebih
  // dari sekali (retry) — id webhook dipakai sebagai kunci unik.
  const { error: errLog } = await supabase.from('mayar_webhook_log').insert({ id: webhookId });
  if (errLog) {
    console.log('[mayar-webhook] webhook id sudah pernah diproses, dilewati:', webhookId);
    return new Response('ok (duplicate)', { status: 200 });
  }

  const proUntil = new Date(Date.now() + paket.hari * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error: errUpdate } = await supabase
    .from('profiles')
    .update({ plan: 'pro', pro_until: proUntil })
    .eq('email', email)
    .select('id');

  if (errUpdate) {
    console.error('[mayar-webhook] gagal update profil:', errUpdate.message);
    return new Response('ok (update failed, logged)', { status: 200 });
  }

  if (!updated || updated.length === 0) {
    // Pembeli belum pernah login ke Ukurra sama sekali, jadi belum ada
    // baris profiles untuk emailnya — tidak ada yang bisa diaktifkan.
    // Butuh aktivasi manual begitu dia login pertama kali.
    console.error(
      '[mayar-webhook] TIDAK ADA akun dengan email ini — aktivasi manual diperlukan:',
      email,
      'paket:', paket.label
    );
    return new Response('ok (no matching account, needs manual activation)', { status: 200 });
  }

  console.log('[mayar-webhook] berhasil aktifkan Pro:', email, paket.label, 'sampai', proUntil);
  return new Response('ok', { status: 200 });
});
