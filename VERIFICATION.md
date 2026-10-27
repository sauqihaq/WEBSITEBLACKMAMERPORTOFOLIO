# Verification — 27 October 2026

## Passed

- Full `npm run build`: Prisma client generation, Next.js 16.4.3 production compilation, TypeScript and route generation.
- `npm run typecheck`.
- `npm run lint`.
- `npm test`: 5 business/security tests covering integer IDR discounts, authoritative payment states, Midtrans SHA-512 signatures, CMS URL/price validation, and origin restrictions.
- npm dependency audit: 0 known vulnerabilities at the last audit in this session.
- 31 HTTP smoke checks passed for public routes, missing-page status, unauthorized admin/download access, forged payment notifications and cross-origin writes.
- 30 isolated integration assertions against **real temporary PostgreSQL 18** and a production Next.js server:
  - Migrations can run twice; owner bootstrap is repeatable without resetting the password.
  - Owner and customer login create real Auth.js sessions.
  - Anonymous/customer access to admin APIs is rejected.
  - Draft project is inaccessible publicly; publish is reflected without redeployment; delete returns 404.
  - Product CRUD uses private-file records and license prices.
  - Free checkout ignores a tampered client price, stores historical order snapshots, and creates an entitlement.
  - Another customer and anonymous clients cannot request the asset.
  - Non-purchasers cannot review; legitimate reviews await moderation.
  - Contact messages persist in PostgreSQL.
  - Paid checkout fails closed without a Midtrans key.
  - Changing current prices does not change historical order items.
  - Revoked entitlements deny access.
  - Password change invalidates existing sessions.
- Browser visual inspection of desktop and mobile home layouts using the supplied PNG.
- Browser interaction checks for portfolio category filters, project navigation, lazy 3D initialization, procedural model rendering, wireframe toggle, and rotation pause.

The integration test used generated local test accounts only. No production account was created, no payment was sent, and no real email was delivered. Temporary test servers were stopped after the run.

## Found and fixed during testing

Root loading streaming caused unavailable project pages to carry HTTP 200 despite rendering the 404 UI. The route-level loading boundary was removed; subsequent integration tests confirmed actual HTTP 404 for unpublished and deleted projects.

## Not verified against external services

- Midtrans Sandbox successful payment, rejection, expiry, refund and webhook retries.
- Vercel Blob callbacks and direct public upload.
- Private S3/R2 upload and delivery of actual file bytes.
- Resend email delivery and domain authentication.
- Vercel deployment, custom-domain routing, production secrets and Core Web Vitals.
- GLB animation files, HDRI assets and device-specific WebGL behavior beyond the procedural sample.

The Playwright suite is supplied, but the browser checks above were performed through the in-app browser controls; `npm run test:e2e` has not been reported as executed.

Use `tests/manual-acceptance.md` before opening the store to real customers. The README also lists advanced features from the master brief that remain outside this implementation; passing core tests does not imply every brief item is complete.

## Pembaruan visual — portrait card

- Foto hero menggunakan kartu CSS 3D berlapis, perspektif, glare, dan pointer tilt.
- Background seluruh halaman memakai gradient merah/ungu dengan siklus gerak 32 detik.
- Layout kartu ditumpuk di layar kecil; tilt dilewati pada touch input, reduced motion, dan pengaturan motion nonaktif.
- Kontak yang sudah dikonfigurasi di CMS tampil konsisten di home, footer, dan halaman contact. Alamat baru Discord/TikTok/email masih menunggu informasi pemilik.
- Validasi: TypeScript dan build produksi lulus; desktop preview dan perubahan tilt diperiksa langsung di browser. Ukuran mobile belum diverifikasi dalam browser pada pembaruan ini.

### Koreksi: foto tanpa bingkai

Kartu dihapus sesuai koreksi pemilik. Komposisi portrait kembali seperti awal: PNG orang berdiri bebas di depan tulisan PORTFOLIO. Efek perspektif/parallax diterapkan langsung pada foto saat kursor bergerak di area hero. Ini efek kedalaman dari foto 2D, bukan model manusia 3D yang dapat diputar penuh. Background gradient tetap dipertahankan. Pointer touch dan reduced-motion menampilkan foto diam.
