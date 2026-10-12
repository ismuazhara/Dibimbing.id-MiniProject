# Backend Task List — Product Catalog API

## Tujuan

Implementasikan REST API CRUD produk menggunakan Node.js, Express, PostgreSQL, dan dokumentasi Swagger UI. Source of truth untuk kontrak API adalah [`../docs/openapi.yaml`](../docs/openapi.yaml); keputusan arsitektur dan schema ada di [`architecture.md`](./architecture.md).

## Catatan sebelum implementasi

- [x] Selaraskan kontrak PRD dengan arsitektur: PostgreSQL persisten dan `variants` berupa array kombinasi warna/ukuran dengan stok per kombinasi.
- [x] Tambahkan currency code alfabetik ISO 4217 per produk pada schema, validasi, response, dan dokumentasi API.
- [x] Pertahankan bentuk sukses `{ "data": ... }`, daftar `{ "data": [...], "meta": { "total": n } }`, dan error RFC 9457 sesuai OpenAPI.
- [x] Scope tidak mencakup autentikasi, checkout, payment, maupun admin dashboard.

Development seed menggunakan `44.00 USD` agar cocok dengan halaman produk yang ada. Migration `002_add_product_currency.sql` mengisi produk lama dengan `USD`; pastikan nilai tersebut benar untuk data pengguna sebelum deployment.

## Phase 1 — Project foundation

### BE-01. Bootstrap aplikasi Node.js
- [x] Inisialisasi `package.json`, source folder, dan script `start`, `dev`, `test`, serta `lint` (syntax check).
- [x] Pasang Express, `pg`, Zod, `swagger-ui-express`, `yaml`, dan tooling test yang diperlukan.
- [x] Tambahkan `app.js` terpisah dari `server.js` agar app dapat dites tanpa membuka port.
- [x] Tambahkan `.gitignore` untuk `.env`, dependency install, log, dan test artifacts.

**Selesai jika:** server bisa dijalankan lokal, health check merespons JSON, dan proses gagal secara jelas jika konfigurasi wajib tidak tersedia.

### BE-02. Konfigurasi environment dan PostgreSQL pool
- [x] Baca serta validasi `PORT`, `NODE_ENV`, dan `DATABASE_URL` dari environment.
- [x] Buat satu `pg.Pool` per proses dengan koneksi/timeouts yang sesuai.
- [x] Sediakan `.env.example` memakai placeholder, jangan menyimpan credential.
- [x] Implementasikan startup DB check dan graceful shutdown untuk menutup pool.

**Selesai jika:** backend terkoneksi ke PostgreSQL, kesalahan koneksi terlihat jelas, dan shutdown menutup pool tanpa meninggalkan koneksi.

## Phase 2 — Database

### BE-03. Buat migration schema produk
- [x] Tambahkan migration untuk tabel `products` dan `product_variants` sesuai [`architecture.md`](./architecture.md).
- [x] Tambahkan migration lanjutan untuk currency code tiga huruf dan backfill data lama tanpa mengubah migration yang telah diterapkan.
- [x] Pastikan constraint untuk nama, harga positif, deskripsi minimal, stok non-negatif, dan kombinasi `(product_id, color, size)` unik.
- [x] Tambahkan foreign key `ON DELETE CASCADE` dan index foreign key variasi.
- [x] Sediakan cara menjalankan dan memeriksa migration; jangan membuat schema otomatis pada setiap server start.
- [x] Tambahkan seed data development minimal untuk produk detail yang dipakai halaman frontend.

**Validasi:** migration dijalankan terhadap PostgreSQL embedded di integration tests. Eksekusi terhadap service PostgreSQL lokal belum dapat dilakukan karena service/port `5432` tidak tersedia di environment ini.

## Phase 3 — API implementation

### BE-04. Request validation dan error middleware
- [x] Buat schema Zod untuk `id`, create/update body, dan variasi produk.
- [x] Validasi `id` sebagai integer positif; trim string; batasi panjang nama, warna, ukuran, dan deskripsi.
- [x] Validasi harga finite dan > 0 dengan maksimal 2 angka desimal serta image URL absolut `http`/`https`.
- [x] Wajibkan currency code tiga huruf kapital pada payload create/update.
- [x] Tolak variasi kosong/duplikat, field tak dikenal, serta `id` atau `isAvailable` yang dikirim client.
- [x] Tangani JSON rusak/body bukan object dan unsupported media type.
- [x] Petakan error aplikasi/database yang relevan ke Problem Details RFC 9457; jangan kirim query, credential, atau stack trace ke client.

**Selesai jika:** input invalid menghasilkan `400` terstruktur dan tidak pernah menyebabkan perubahan parsial.

### BE-05. Product repository
- [x] Implementasikan query repository untuk list/detail/insert/update/delete produk beserta variasi.
- [x] Gunakan parameterized SQL untuk semua nilai request.
- [x] Gunakan transaksi untuk operasi create dan update multi-tabel.
- [x] Implementasikan update sebagai penggantian penuh daftar variasi dalam transaksi.
- [x] Kembalikan product JSON dengan `variants` sebagai array kombinasi warna/ukuran.
- [x] Konversikan nilai PostgreSQL `NUMERIC` secara konsisten menjadi number API tanpa kehilangan validitas harga.
- [x] Petakan currency code tersimpan ke field `currency` pada seluruh response produk.
- [x] Hitung `isAvailable` dari total stok variasi; jangan menyimpan field turunan ini di database.

**Selesai jika:** repository mengembalikan struktur data yang cocok dengan OpenAPI dan rollback menjaga integritas saat operasi multi-tabel gagal.

### BE-06. Service, controller, dan CRUD routes
- [x] Pisahkan aturan bisnis di service, HTTP handling di controller, dan mapping route di router.
- [x] Implementasikan `GET /api/products` (`200`, termasuk daftar kosong).
- [x] Implementasikan `GET /api/products/:id` (`200`, `400` untuk ID invalid, `404` untuk produk tidak ditemukan).
- [x] Implementasikan `POST /api/products` (`201`, header `Location`, response `{ "data": product }`).
- [x] Implementasikan `PUT /api/products/:id` sebagai full replacement (`200`).
- [x] Implementasikan `DELETE /api/products/:id` (`204` tanpa body).
- [x] Pastikan error `404` memakai extension `code: "PRODUCT_NOT_FOUND"`.
- [x] Pasang handler 404 route dan error middleware terpusat.

**Selesai jika:** seluruh endpoint bekerja terhadap PostgreSQL sesuai status code, kontrak, dan response di OpenAPI.

## Phase 4 — Swagger / OpenAPI

### BE-07. Integrasikan Swagger UI
- [x] Gunakan [`../docs/openapi.yaml`](../docs/openapi.yaml) sebagai source of truth dokumentasi.
- [x] Parse file YAML dan pasang Swagger UI melalui `swagger-ui-express` pada `GET /api-docs`.
- [x] Sajikan spec mentah pada `GET /api-docs/openapi.yaml` dengan content type YAML.
- [x] Pastikan operasi Swagger UI mengarah ke server API aktual dan tidak menyertakan credential.
- [x] Pasang routes dokumentasi sebelum fallback 404.
- [x] Validasi OpenAPI spec sebagai bagian dari test/CI.
- [x] Perbarui file OpenAPI bersamaan bila kontrak API berubah.

**Selesai jika:** UI dan raw spec dapat diakses lokal, seluruh operasi CRUD tampil, dan spec lolos validator.

## Phase 5 — Testing dan kesiapan rilis

### BE-08. Automated tests
- [x] Unit test aturan validasi pada nilai batas valid/invalid.
- [x] Integration test repository/service memakai database PostgreSQL embedded terpisah (PGlite).
- [x] API test untuk operasi CRUD, empty list, `400`, `404`, `409`, `415`, dan `500`.
- [x] Uji rollback create/update saat penyimpanan salah satu variasi gagal.
- [x] Uji delete cascade, keunikan variasi, dan perhitungan `isAvailable`.
- [x] Uji `/api-docs` dan `/api-docs/openapi.yaml`.

**Selesai jika:** semua test lulus tanpa bergantung pada data development atau database lokal yang dipakai pengguna.

### BE-09. Operasional dan integrasi
- [x] Dokumentasikan cara setup PostgreSQL, mengisi environment, menjalankan migration/seed, start server, dan menjalankan test.
- [x] Atur CORS ke origin frontend yang diizinkan dan batas ukuran JSON body.
- [x] Tambahkan request ID/logging tanpa credential atau payload sensitif.
- [ ] Uji integrasi dari browser/frontend dengan PostgreSQL service aktual. HTTP CRUD diuji end-to-end dengan PostgreSQL embedded.

**Selesai jika:** developer lain dapat menjalankan backend dari instruksi bersih dan frontend dapat mengakses endpoint sesuai konfigurasi.

## Urutan dan dependensi

```text
BE-01 -> BE-02 -> BE-03 -> BE-05 -> BE-06 -> BE-09
                    BE-04 -> BE-06
BE-01 -> BE-07
BE-03 -> BE-08 (test memakai PostgreSQL test database)
BE-04 -> BE-08
BE-05 -> BE-08
BE-06 -> BE-08
BE-07 -> BE-08
```

## Backend Definition of Done

- [x] CRUD endpoints mengikuti OpenAPI 3.1 dan API error mengikuti RFC 9457.
- [x] Data produk dan variasi tersimpan persisten di PostgreSQL; schema dan perilaku diverifikasi pada PGlite.
- [x] Validasi berjalan sebelum penulisan dan aturan penting juga dijaga constraint database.
- [x] Create/update atomik; tidak ada data parsial bila transaksi gagal.
- [x] Swagger UI dan raw OpenAPI spec dapat diakses dan spec tervalidasi.
- [x] Automated tests, setup instructions, dan konfigurasi environment tersedia.

**Verifikasi yang masih dibutuhkan di mesin target:** mulai service PostgreSQL, jalankan `npm.cmd run migrate`, `npm.cmd run seed`, `npm.cmd start`, lalu cek readiness pada `/health/ready`.
