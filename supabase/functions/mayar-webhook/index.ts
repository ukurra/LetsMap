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

// ID produk asli dari Mayar (data.productId), dikonfirmasi lewat
// transaksi uji sungguhan 2026-11-03 — bukan nominal lagi, karena
// nominal bisa berubah kalau biaya admin ditanggung pembeli
// (isAdminFeeBorneByCustomer) sementara ID produk selalu tetap.
const PAKET: Record<string, { hari: number; label: string }> = {
  'f31075f3-f5d5-4686-bc98-5a8b81b5681b': { hari: 365, label: 'tahunan' }, // Ukurra Standard — Tahunan
  'd753abc3-1256-4b96-a074-fa89fd8f3f69': { hari: 30, label: 'bulanan' }, // Ukurra Standard — Bulanan
};

// TODO: isi setelah produk "Ukurra Organisasi — Tahunan" dibuat di Mayar
// dan diuji dengan transaksi sungguhan (sama seperti PAKET di atas).
const ORGANISASI_PRODUCT_ID = '';

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
  const productId = String(data.productId ?? '');
  const webhookId = String(data.id ?? '');

  if (!email || !productId || !webhookId) {
    console.error('[mayar-webhook] payload tidak lengkap:', { email, productId, webhookId });
    return new Response('ok (incomplete, logged)', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Organisasi: bukan satu pembeli, tapi 5 email tim yang sudah
  // didaftarkan lewat formulir di index.html SEBELUM checkout (lihat
  // organisasi_pending di supabase-schema.sql). Dicek duluan, sebelum
  // PAKET di bawah, karena alurnya sama sekali berbeda dari Standard.
  if (ORGANISASI_PRODUCT_ID && productId === ORGANISASI_PRODUCT_ID) {
    const { data: pending, error: errPending } = await supabase
      .from('organisasi_pending')
      .select('id, team_emails')
      .eq('buyer_email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errPending || !pending) {
      console.error(
        '[mayar-webhook] tidak ada pendaftaran Organisasi pending untuk email ini:',
        email,
        errPending?.message
      );
      return new Response('ok (no pending organisasi registration)', { status: 200 });
    }

    // Anti dobel-aktivasi, sama seperti Standard di bawah.
    const { error: errLogOrg } = await supabase.from('mayar_webhook_log').insert({ id: webhookId });
    if (errLogOrg && errLogOrg.code === '23505') {
      console.log('[mayar-webhook] webhook id sudah pernah diproses, dilewati:', webhookId);
      return new Response('ok (duplicate)', { status: 200 });
    }

    // Anggota tim yang SUDAH punya akun langsung diperbarui di sini.
    // Yang belum pernah login tetap kebagian lewat trigger
    // ukurra_new_user() begitu status di bawah jadi 'activated'.
    const { error: errUpdateTeam } = await supabase
      .from('profiles')
      .update({ plan: 'organisasi', pro_until: null })
      .in('email', pending.team_emails);

    if (errUpdateTeam) {
      console.error('[mayar-webhook] gagal update sebagian/semua profil tim organisasi:', errUpdateTeam.message);
    }

    const { error: errMarkActivated } = await supabase
      .from('organisasi_pending')
      .update({ status: 'activated', activated_at: new Date().toISOString() })
      .eq('id', pending.id);

    if (errMarkActivated) {
      console.error('[mayar-webhook] gagal menandai organisasi_pending activated:', errMarkActivated.message);
    }

    console.log('[mayar-webhook] berhasil aktifkan Organisasi untuk:', pending.team_emails.join(', '));
    return new Response('ok (organisasi activated)', { status: 200 });
  }

  const paket = PAKET[productId];
  if (!paket) {
    console.error('[mayar-webhook] productId tidak dikenali, bukan produk Ukurra Standard/Organisasi:', productId);
    return new Response('ok (unknown product)', { status: 200 });
  }

  // Anti dobel-aktivasi kalau Mayar mengirim webhook yang sama lebih
  // dari sekali (retry) — id webhook dipakai sebagai kunci unik.
  // PENTING: hanya pelanggaran unique constraint (23505, artinya id ini
  // SUDAH diproses) yang boleh menghentikan aktivasi. Error lain (mis.
  // tabelnya belum dibuat) tetap dilanjutkan ke aktivasi — kalau tidak,
  // satu masalah infra diam-diam membuat semua pembayaran gagal aktif
  // tanpa jejak, disangka "sudah pernah diproses".
  const { error: errLog } = await supabase.from('mayar_webhook_log').insert({ id: webhookId });
  if (errLog && errLog.code === '23505') {
    console.log('[mayar-webhook] webhook id sudah pernah diproses, dilewati:', webhookId);
    return new Response('ok (duplicate)', { status: 200 });
  }
  if (errLog) {
    console.error('[mayar-webhook] gagal catat log (lanjut aktivasi tetap jalan):', errLog.message);
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
