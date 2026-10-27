# BLACKMAMERSTUDIO

Portfolio hitam–merah untuk studio 3D, menggunakan foto PNG yang diberikan. Satu aplikasi Next.js App Router untuk website, admin, akun, dan API; target hosting Vercel. Tidak ada Express server terpisah atau penyimpanan produksi di filesystem.

## Status yang perlu diketahui

Source aplikasi dan integrasi inti sudah dibuat. Preview tanpa `DATABASE_URL` menampilkan **konten contoh yang diberi label**. Contoh produk tidak dapat dibeli. Setelah database dikonfigurasi, katalog dibaca dari PostgreSQL dan dapat dikelola melalui CMS.

Belum ada database, merchant Midtrans, bucket storage, domain email, atau project Vercel milik pengguna yang terhubung. Migrasi, login owner/customer, CRUD persisten, checkout gratis, entitlement, pembatasan akses, dan penyimpanan pesan sudah diuji dengan PostgreSQL lokal sementara. Upload storage, pengiriman email, pembayaran Sandbox, dan pengiriman byte unduhan berbayar belum diuji end-to-end dengan layanan eksternal. Jangan menganggap hasil build sebagai sertifikasi siap transaksi produksi.

Lihat `VERIFICATION.md` untuk hasil yang benar-benar dijalankan dan `tests/manual-acceptance.md` untuk pengujian layanan terhubung.

## Jalankan preview

Node.js 22 LTS dan npm diperlukan.

```sh
npm ci
npm run dev
```

Buka `http://127.0.0.1:3000`. Untuk preview konten contoh, **jangan isi DATABASE_URL dengan URL placeholder**. Cukup jalankan tanpa `.env` terlebih dahulu. Data contoh bukan database produksi dan tidak dipakai setelah PostgreSQL tersambung.

Pada Windows, hentikan dev server sebelum `npm ci`, `prisma generate`, atau `npm run build` agar engine Prisma tidak terkunci.

## Konfigurasi database dan owner

1. Buat PostgreSQL terkelola melalui Vercel Marketplace atau provider PostgreSQL lain.
2. Salin `.env.example` ke `.env`. Isi `DATABASE_URL` dengan pooled connection; isi `DIRECT_URL` dengan direct connection untuk migrasi. Gunakan TLS sesuai panduan provider.
3. Set `NEXTAUTH_URL` ke origin aplikasi yang persis digunakan, termasuk port untuk lokal. Buat `NEXTAUTH_SECRET` dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Simpan secret di environment, bukan repository.
4. Jalankan `npm run db:migrate`.
5. Isi `OWNER_EMAIL`, `OWNER_PASSWORD` (minimal 16 karakter), dan `OWNER_NAME`.
6. Jalankan `npm run db:seed`. Seed tidak mengubah password owner yang sudah ada dan tidak menaikkan role akun customer.
7. Hapus `OWNER_PASSWORD` dari konfigurasi setelah bootstrap. Restart server. Buka `/admin/login`.

Untuk contoh portfolio development: set `SEED_DEMO=true`; seed membuat draft, tidak memalsukan customer, transaksi, review, atau pendapatan. Pada production seed contoh ditolak.

## Alur admin

- **Portfolio:** Add New → judul, slug, deskripsi Markdown, cover dari media library, kategori/tags, gallery, GLB preview, detail, urutan, featured, dan status. PUBLISHED muncul langsung pada website; DRAFT/ARCHIVED tidak ditampilkan publik.
- **Media:** upload public image/video/GLB langsung ke Vercel Blob. Upload ZIP atau file berbayar dengan pilihan private ke S3-compatible storage. Ada progress dan multi-file upload. Metadata hanya dibuat setelah konfirmasi storage.
- **Products:** pilih cover, tulis spesifikasi, tambah lisensi/harga/ketentuan, pilih file privat dari library, lalu publish. Produk tidak dapat dipublikasikan tanpa file privat. Mengarsipkan produk tidak menghapus hak pembeli terdahulu.
- **Homepage/settings:** edit identitas, foto, hero image/video/model/gradient, intro, tentang studio, kontak, sosial, skills, warna, tema, radius, animasi, dan susunan/visibilitas section.
- **Services, journal, pages:** CRUD draft/published/archived. Kebijakan awal merupakan draft yang harus ditinjau sebelum toko publik.
- **Orders:** melihat snapshot pembelian, export CSV, dan reconcile terhadap Midtrans. Tidak tersedia tombol manual untuk memaksa status PAID.
- **Messages/commissions:** baca, ubah status, simpan catatan internal, dan buka draft balasan melalui aplikasi email.
- **Reviews:** hanya akun dengan entitlement aktif yang dapat mengirim review; review harus disetujui admin sebelum tampil.
- **Coupons:** persentase/fixed IDR, minimum order, expiry, batas penggunaan, dan pembatasan product IDs. Kupon dihitung server-side. Penggunaan dipesan ketika checkout dibuat; reservation order gagal tidak otomatis dilepas, sehingga batas bersifat konservatif.
- **Analytics:** agregat nyata dari database dan revenue enam bulan; tidak ada angka dummy.

Tabel admin mengambil maksimal 200 record terbaru dan membaginya menjadi halaman 20 record. Untuk skala katalog/transaksi besar, ganti pembatasan ini dengan pagination server-side sebelum peluncuran berskala besar.

## Public media — Vercel Blob

1. Buat **public** Blob store dan hubungkan ke project Vercel.
2. Isi `BLOB_READ_WRITE_TOKEN`.
3. Token upload hanya diberikan setelah pemeriksaan admin dan origin. Batas publik 150 MB; format gambar PNG/JPEG/WebP/AVIF, video MP4/WebM, GLB. MIME harus cocok dengan ekstensi yang diizinkan.
4. Upload browser memakai `@vercel/blob/client`; file di atas 5 MB menggunakan multipart. Request body API hanya membawa metadata/token, bukan payload file.
5. Callback `/api/upload` perlu dapat dijangkau Vercel Blob. Untuk pengembangan lokal, gunakan preview deployment atau tunnel milik Anda. Callback divalidasi SDK, bukan cookie admin.

GLB adalah format upload viewer yang disarankan. Viewer juga dapat membuka URL glTF dengan resource eksternal yang sudah di-host dengan CORS yang benar. Tidak ada konversi otomatis BLEND/FBX/OBJ ke GLB.

## Private paid files — S3 / Cloudflare R2

1. Buat bucket privat; jangan aktifkan public access.
2. Isi `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
3. Beri kredensial hak hanya pada bucket yang digunakan. Browser CORS harus mengizinkan origin website dan method PUT dengan Content-Type. Contoh:

```json
[{"AllowedOrigins":["https://your-domain.example"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```

4. Upload privat memakai URL PUT sementara (15 menit), maksimum 2 GB. Setelah upload, server memeriksa metadata dengan HEAD dan mencatat file. Upload privat saat ini single PUT; resumable multipart privat belum tersedia.
5. Pembeli meminta `/api/download/[fileId]`. Server memeriksa session, kepemilikan order berstatus PAID, entitlement, revocation, dan limit, lalu memberi URL S3 berlaku 60 detik. URL bukan akses permanen.

Adapter pengiriman private Vercel Blob disediakan pada `src/lib/storage.ts` menggunakan `BLOB_PRIVATE_READ_WRITE_TOKEN`, tetapi uploader CMS privat menggunakan S3 supaya file besar tidak diproksikan melalui Function. Jangan memakai private Blob proxy untuk aset besar. Unduhan yang sudah diberi URL dapat tetap dipakai sampai URL kedaluwarsa meskipun entitlement dicabut di tengah periode tersebut.

## Midtrans Snap

1. Buat merchant Sandbox Midtrans. Isi **Server Key** ke `MIDTRANS_SERVER_KEY`, dengan `MIDTRANS_PRODUCTION=false`.
2. Set Payment Notification URL ke `https://YOUR_DOMAIN/api/commerce/webhook`.
3. Set finish URL ke `https://YOUR_DOMAIN/checkout/success`. Redirect hanya menampilkan petunjuk pemeriksaan status; tidak menetapkan lunas.
4. Customer harus masuk dan memverifikasi email. Server mengambil harga, lisensi, produk aktif, dan kupon dari PostgreSQL.
5. Checkout membuat order snapshot immutable dan Snap transaction melalui server. Customer diarahkan ke hosted Snap checkout; tidak ada Server Key di frontend.
6. Webhook memvalidasi SHA-512 signature, lalu mengambil status resmi Midtrans. Order ID, total, currency, dan status diverifikasi ulang.
7. Status PAID membuat satu entitlement per order item dengan unique constraint dan transaksi serializable. Refund/chargeback mencabut entitlement. Retry tidak membuat entitlement ganda.
8. Customer/admin dapat reconcile order. Bila pembuatan Snap timeout, order tetap tersimpan dan tidak dipalsukan berhasil; selesaikan rekonsiliasi sebelum membuat pembayaran baru.
9. Setelah seluruh flow Sandbox lulus, set key production dan `MIDTRANS_PRODUCTION=true`, lalu pastikan notification URL production benar. Metode QRIS/VA/e-wallet tergantung aktivasi merchant.

## Email, spam protection, dan maintenance

- Verifikasi domain Resend, isi `RESEND_API_KEY`, `EMAIL_FROM`, dan `ADMIN_EMAIL`.
- Registrasi, reset password, email verification, receipt, dan konfirmasi contact menggunakan email outbox PostgreSQL. Password di-hash bcrypt; token email disimpan sebagai hash dengan expiry satu jam.
- Kegagalan pengiriman receipt tidak menggagalkan transaksi pembayaran. Admin dapat retry melalui Account & Security. Setelah 5 percobaan gagal, perlu pemeriksaan layanan sebelum reset attempts secara terkontrol.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` harus diaktifkan bersama. Jika tidak diisi, honeypot dan rate limiting tetap bekerja.
- Endpoint `/api/maintenance` memakai Bearer `CRON_SECRET`, membersihkan token/rate-limit expired, retry email, dan rekonsiliasi pending orders. Hubungkan scheduler Vercel atau scheduler tepercaya setelah deployment; konfigurasi jadwal tidak diaktifkan otomatis.
- Vercel Analytics dan Speed Insights aktif saat environment `VERCEL` tersedia. Error monitoring Sentry belum diintegrasikan.

## Deploy ke Vercel

1. Push folder project ini ke repository GitHub milik Anda. Jangan push `.env`, `.next`, atau `node_modules`.
2. Import repository ke Vercel, pilih framework Next.js dan root project yang benar. `vercel.json` sudah tersedia.
3. Tambahkan environment database, auth, storage, email, dan Midtrans pada environment Vercel yang tepat. Jangan mencampur production dan sandbox keys.
4. Jalankan migrasi dari lingkungan tepercaya sebelum membuka traffic: `npm run db:migrate`. Migrasi sengaja tidak otomatis berjalan pada setiap preview build.
5. Jalankan bootstrap owner sekali. Jangan membiarkan bootstrap password tersimpan pada environment permanen.
6. Build: `npm run build`. Install: `npm ci`. Next menjalankan Route Handlers bersama frontend pada satu project.
7. Hubungkan custom domain; set `NEXTAUTH_URL` ke domain final dan sesuaikan bucket CORS, Resend, webhook, serta Turnstile.
8. Jalankan checklist layanan terhubung. Isi kontak bisnis, karya asli, file produk, harga, lisensi, dan kebijakan sebelum membuka toko untuk publik.

Tidak ada deployment Vercel yang dibuat dari sesi ini karena akun/project dan kredensial deploy tidak tersedia. Sites Cloudflare tidak digunakan sebagai pengganti backend Vercel yang diminta.

## Struktur source

```text
src/app/                  Home, dynamic public routes, protected admin, API
src/components/           Public UI, catalog/cart, forms, CMS, lazy 3D viewer
src/lib/                  Auth, PostgreSQL, pricing/payments, storage, validation
prisma/schema.prisma      Normalized core models + flexible content/spec metadata
prisma/migrations/        Initial PostgreSQL SQL migration
prisma/seed.ts            Explicit one-time owner bootstrap
public/                   Supplied portrait and clearly labeled concept assets
tests/                    Business/security tests, smoke tests, Playwright specs
```

Auth.js is provided through stable `next-auth` v4 with JWT sessions plus server database authorization and session-version invalidation. Styling uses Tailwind v4 and custom editorial components; this delivery does not include generated shadcn components. Dependencies are pinned by `package-lock.json`. No UI login bypass or hardcoded admin password is supplied.

## Scope limits relative to the extended master brief

The connected core is implemented, but this is not a claim that every advanced bullet in the master brief is complete. These extensions remain: product bundles, sale-price scheduling, customer cart synchronization UI, guest purchase claim flow, private commission attachments, true WYSIWYG editor/drag-and-drop gallery ordering, media replacement/deletion workflows, private resumable multipart uploads, per-product SEO editing/structured data, HDRI/model-statistics viewer controls, scheduled blog publication, custom logo/font/favicon controls, maintenance-mode UI, richer analytics/date filters, and integrated outbound admin replies. Descriptions support safe Markdown and media ordering follows editor line order. Media deletion is deliberately blocked in CMS until references can be audited; use provider tooling only after verifying references.

These limits are documented so unfinished capabilities are not mistaken for working production features. The supplied code provides functional implementations for the main portfolio/CMS/account/cart/payment/download/contact flows once configured; connected-service verification remains required.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
node tests/smoke.mjs
npm run test:e2e
```

Install a compatible Playwright browser in your testing environment before `test:e2e`. Browser specs are provided; see verification report for which checks were actually executed.

Reference docs used during implementation: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Vercel Blob](https://vercel.com/docs/vercel-blob), [Midtrans notifications](https://docs.midtrans.com/docs/https-notification-webhooks).

### Reproduce local database integration tests

After building the main project, run `npm install` and `npm test` inside `tests/integration/`. This optional test runtime installs PostgreSQL binaries for your platform separately from production dependencies. It starts only loopback ports 55439 and 3002, uses generated test accounts, disables external email/payment credentials, and stops its servers after the test. Test data is retained in an isolated `blackmamer-integration-*` folder in your OS temporary directory for inspection. No production database is used.
