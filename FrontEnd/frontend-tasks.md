# Frontend Task List — Product Detail API Integration

## Tujuan

Integrasikan halaman detail produk yang saat ini menggunakan HTML/CSS/JavaScript vanilla dengan Product Catalog API. Implementasi UI existing berada di `index.html`, `styles.css`, dan `script.js`. Kontrak data/API mengikuti OpenAPI spec [`../api-backend/docs/openapi.yaml`](../api-backend/docs/openapi.yaml); rencana frontend ini tidak mengasumsikan framework baru.

## Catatan scope

- Scope frontend adalah halaman product detail yang membaca data dari API dan alur keranjang yang sudah ada.
- Halaman admin/dashboard untuk membuat, mengubah, atau menghapus produk **tidak** termasuk scope saat ini. Endpoint CRUD selain GET dikonsumsi melalui tool pengujian/API client sampai UI admin diminta.
- API menggunakan `variants` sebagai array kombinasi warna/ukuran dengan stok per kombinasi. Ini berbeda dari model hardcoded saat ini; jangan mengasumsikan satu stok global.
- Galeri memakai satu foto `image` dari API; foto tambahan tidak ditampilkan karena kontrak belum mendukung banyak gambar.
- Harga dan subtotal menggunakan `currency` code produk dari API; seed/demo memakai USD. Subtotal dalam mata uang berbeda dikelompokkan terpisah tanpa konversi.
- Frontend berjalan pada `http://localhost:5500` dan API default pada `http://localhost:3000`; konfigurasi dan cara menjalankan ada di [`README.md`](README.md).

## Phase 1 — Contract dan persiapan

### FE-01. Selaraskan kontrak data UI/API
- [x] Tinjau OpenAPI spec dan sepakati base URL melalui konfigurasi lingkungan.
- [x] Tentukan product ID halaman demo (`1` untuk seed database kosong; dapat diubah melalui parameter `productId`).
- [x] Selaraskan tampilan/format `price` dengan currency code API; seed memakai USD.
- [x] Sertakan currency code saat produk dibuat/diperbarui dan render pada halaman/cart.
- [x] Gunakan hanya URL gambar tunggal dari API; tambahan galeri menunggu perubahan kontrak.
- [x] Petakan `variants[]` menjadi opsi warna/ukuran dan stok per kombinasi.

**Selesai jika:** field mapping, base URL, product ID, gambar, mata uang, dan variasi tidak memiliki asumsi ambigu.

### FE-02. Siapkan konfigurasi API client
- [x] Tambahkan konfigurasi base URL yang tidak menyimpan secret di browser.
- [x] Buat helper fetch terpusat untuk JSON API.
- [x] Periksa status HTTP sebelum membaca response JSON; tangani `204 No Content` tanpa mencoba parse body.
- [x] Parse RFC 9457 Problem Details dan error per field secara terkontrol.
- [x] Jangan tampilkan detail server internal atau stack trace kepada pengguna.

**Selesai jika:** request API menggunakan satu entry point/configuration dan kegagalan HTTP/network dapat ditampilkan dengan pesan yang aman.

## Phase 2 — Product detail integration

### FE-03. Ambil detail produk dari API
- [x] Panggil `GET /api/products/:id` saat halaman siap.
- [x] Hapus hardcoded product name, price, main image, description, dan variant values yang sekarang harus berasal dari API.
- [x] Render data dari envelope `{ "data": product }`.
- [x] Pertahankan konten statis non-product (misalnya shipping/promo) hanya jika memang bagian dari UI requirement, tidak berasal dari product endpoint.
- [x] Pastikan alt text gambar tetap bermakna; jangan menampilkan URL sebagai alt text.

**Selesai jika:** nama, harga, gambar, deskripsi, warna, ukuran, dan stok yang terlihat berasal dari respons API, bukan hardcode.

### FE-04. Loading, error, dan not-found states
- [x] Tampilkan loading state selama request berjalan dan cegah CTA memakai data lama.
- [x] Tampilkan error state yang dapat dipahami jika request jaringan/API gagal.
- [x] Tangani `404` produk tidak ditemukan dengan state not-found.
- [x] Sediakan retry untuk kegagalan yang dapat dicoba ulang.
- [x] Jangan menampilkan content product fallback seolah-olah berhasil bila API gagal.

**Selesai jika:** loading, gagal, retry, dan produk tidak ditemukan terlihat jelas serta tidak meninggalkan state UI yang misleading.

## Phase 3 — Variasi dan keranjang

### FE-05. Bangun pilihan varian dari kombinasi stok
- [x] Bangun pilihan warna dan ukuran dari pasangan kombinasi pada `variants[]`.
- [x] Saat warna berubah, hitung ukuran yang tersedia hanya dari kombinasi warna tersebut.
- [x] Tandai kombinasi dengan `quantity === 0` sebagai unavailable/sold out dan nonaktifkan pilihan pembeliannya.
- [x] Validasi bahwa kombinasi warna/ukuran terpilih benar-benar ada dan memiliki stok.
- [x] Reset atau pilih ulang size yang tidak lagi cocok saat user mengganti warna.
- [x] Tampilkan error/accessibility announcement yang sesuai bila kombinasi tidak tersedia.

**Selesai jika:** user tidak dapat memilih kombinasi yang tidak ada atau kehabisan stok, dan perubahan warna/ukuran tidak membuat state varian tidak valid.

### FE-06. Quantity dan Add to Cart
- [x] Batasi quantity pembelian minimum 1 dan maksimum stok kombinasi terpilih.
- [x] Disable/ubah CTA saat stok habis atau varian belum dipilih.
- [x] Gunakan harga, nama, dan image dari API saat menambah produk ke cart.
- [x] Simpan identitas varian (color/size) pada item cart agar kombinasi berbeda tidak tercampur.
- [x] Periksa stok ketika quantity dinaikkan dari cart; jangan melebihi quantity tersedia.
- [x] Pertahankan dan regression-test cart drawer, count, subtotal, toast, dan kontrol remove.

**Selesai jika:** cart menambahkan data API untuk varian yang benar dan tidak mengizinkan pembelian melebihi stok yang tersedia.

## Phase 4 — Accessibility, responsive, dan kualitas

### FE-07. Accessibility dan responsive behavior
- [x] Pertahankan navigasi keyboard, focus state, label tombol, live-region status, dan alt text.
- [x] Pastikan opsi sold out/status stok bisa dipahami screen reader dan tidak hanya ditandai dengan warna.
- [x] Uji loading/error/not-found/empty variants pada ukuran mobile dan desktop melalui UI; koneksi API live masih perlu diverifikasi.
- [x] Pastikan pesan status API tidak memecah layout atau menutupi kontrol utama.

**Selesai jika:** semua state API dan varian dapat digunakan dengan keyboard dan layout tetap berfungsi pada breakpoint utama.

### FE-08. Pengujian dan integrasi
- [x] Tambahkan test/helper checks untuk mapping response dan RFC 9457 errors.
- [x] Uji manual/otomatis product detail saat API berhasil, lambat (loading), gagal, dan mengembalikan 404 melalui respons simulasi.
- [x] Uji kombinasi warna/ukuran, kombinasi stok 0, serta batas quantity melalui respons simulasi.
- [x] Regression-test gallery/modal, size guide, cart drawer, promo copy, dan responsive layout.
- [ ] Jalankan frontend melawan backend/PostgreSQL aktual dari origin yang diizinkan dan verifikasi konfigurasi CORS.

**Selesai jika:** API integration dan pengalaman UI utama lulus pengujian serta tidak merusak interaksi halaman existing.

## Urutan dan dependensi

```text
FE-01 -> FE-02 -> FE-03 -> FE-04
                    FE-03 -> FE-05 -> FE-06
FE-03 -> FE-07
FE-04 -> FE-08
FE-05 -> FE-08
FE-06 -> FE-08
FE-07 -> FE-08
```

FE-01 perlu dikonfirmasi bersama backend sebelum FE-03/FE-05, khususnya format varian, mata uang, dan URL gambar. FE-03 bergantung pada endpoint detail dan data seed yang tersedia.

## Frontend Definition of Done

- [x] Halaman detail mengambil data produk aktual dari API dan tidak memiliki hardcode untuk field product.
- [x] Loading, error, retry, dan not-found states bekerja.
- [x] Pemilihan variasi mengikuti stok per kombinasi.
- [x] Add-to-cart dan seluruh quantity control menghormati stok.
- [x] Aksesibilitas, responsive layout, dan interaksi existing tidak mengalami regression.
- [x] Base URL/API setup terdokumentasi dan tidak menyimpan credential di client.

Integrasi terhadap backend hidup dan CORS aktual tetap menjadi verifikasi tertunda sampai PostgreSQL/backend tersedia.
