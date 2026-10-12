# PRD – E-Commerce Product Catalog API

## 1. Ringkasan Produk
Aplikasi ini menyediakan API untuk menampilkan detail produk pada halaman e-commerce. Fokus utama adalah menyajikan data produk yang konsisten, valid, dan siap dipakai oleh frontend product detail page. API harus mampu mengembalikan informasi produk seperti nama, harga, foto, variasi, dan deskripsi untuk satu produk tertentu.

Tujuan utama dari produk ini adalah:
- Menyediakan sumber data yang konsisten untuk halaman detail produk
- Memastikan data produk valid sebelum dikirim ke frontend
- Memudahkan integrasi antara backend dan halaman product detail
- Menjamin pengalaman pengguna tidak terganggu akibat data yang tidak lengkap atau salah format

## 2. Latar Belakang dan Masalah
Halaman detail produk membutuhkan data yang lengkap agar user dapat memahami produk sebelum membeli. Jika data produk tidak valid, hasilnya bisa berupa harga tidak muncul, foto gagal ditampilkan, variasi tidak jelas, dan deskripsi tidak lengkap. Karena itu, backend perlu menyediakan API yang mengembalikan struktur data terstandar dan menerapkan validasi input sebelum data dikirim.

## 3. Target Pengguna
### 3.1 Pengguna utama
- Pelanggan e-commerce yang sedang melihat detail produk
- Pengguna yang ingin membandingkan opsi warna/ukuran dan melihat informasi produk

### 3.2 Pengguna bisnis / pemilik produk
- Tim product / owner yang membutuhkan data produk yang konsisten untuk UI
- Developer yang mengintegrasikan API ke frontend

## 4. Tujuan Produk
- Menyediakan API CRUD produk: daftar produk, detail produk, tambah produk, perbarui produk, dan hapus produk
- Menampilkan informasi produk yang relevan dan siap dipakai UI
- Menerapkan validasi input agar data yang dikirim tidak rusak atau tidak lengkap
- Memastikan API dapat dikonsumsi oleh frontend detail product tanpa proses tambahan

## 5. Scope
### In Scope
- Endpoint CRUD produk
- Data produk yang mencakup nama, harga, foto, variasi, dan deskripsi
- Persistensi produk dan variasi pada PostgreSQL
- Validasi input data produk
- Response yang terstruktur dalam format JSON
- Penanganan error untuk data tidak valid atau produk tidak ditemukan
- Dokumentasi API dengan OpenAPI dan Swagger UI

### Out of Scope
- Manajemen user account
- Proses checkout
- Payment gateway
- Dashboard admin produk

## 6. Data Schema
### 6.1 Product Schema
```json
{
  "id": 1,
  "name": "Ultimate Bison Boot Sock",
  "price": 150000,
  "currency": "IDR",
  "image": "https://example.com/images/boot-sock.png",
  "variants": [
    { "color": "Coffee", "size": "S/M", "quantity": 8 },
    { "color": "Wild Green", "size": "M/L", "quantity": 4 }
  ],
  "description": "Kaus kaki boot tebal dengan bahan hangat, nyaman, dan tahan lama.",
  "isAvailable": true
}
```

### 6.2 Field Rules
| Field | Type | Required | Validation |
|---|---|---:|---|
| id | integer | Ya | Harus angka positif |
| name | string | Ya | Minimal 3 karakter, maksimal 120 |
| price | number | Ya | Harus numerik dan > 0 |
| currency | string | Ya | Kode mata uang alfabetik ISO 4217, tiga huruf kapital |
| image | string | Ya | Harus string URL valid |
| variants | array | Ya | Minimal satu kombinasi warna/ukuran |
| variants[].color | string | Ya | Tidak kosong, maksimal 80 karakter |
| variants[].size | string | Ya | Tidak kosong, maksimal 40 karakter |
| variants[].quantity | integer | Ya | Bilangan bulat non-negatif per kombinasi |
| description | string | Ya | Minimal 20 karakter |
| isAvailable | boolean | Ya pada response | Diturunkan backend jika total quantity seluruh variasi > 0; tidak dapat ditulis client |

## 7. Functional Requirements
### FR-01 Product detail endpoint
Sistem harus menyediakan endpoint `GET /api/products/:id` yang mengembalikan detail produk sesuai `id`.

### FR-02 Product collection endpoint
Sistem harus menyediakan `GET /api/products` untuk mengembalikan daftar semua produk.

### FR-03 Create product endpoint
Sistem harus menyediakan `POST /api/products` untuk membuat produk baru dari request body yang valid. Backend membuat `id` unik; client tidak boleh menentukan `id`.

### FR-04 Update product endpoint
Sistem harus menyediakan `PUT /api/products/:id` untuk mengganti seluruh field produk yang dapat diedit. Semua field wajib selain `id` harus disertakan dan divalidasi.

### FR-05 Delete product endpoint
Sistem harus menyediakan `DELETE /api/products/:id` untuk menghapus produk berdasarkan `id`.

### FR-06 Product fields
Response produk harus mencakup field berikut:
- `id`
- `name`
- `price`
- `currency`
- `image`
- `variants`
- `description`

### FR-07 Variant support
Sistem harus mengirimkan `variants` sebagai array kombinasi yang setiap item-nya mencakup warna, ukuran, dan jumlah stok untuk kombinasi tersebut.

### FR-08 Validation for input
Sistem harus memvalidasi seluruh request body pada operasi create/update dan memvalidasi path `id` pada operasi detail/update/delete.

### FR-09 Error handling
Sistem harus mengembalikan response error konsisten saat input tidak valid, produk tidak ditemukan, atau terjadi kegagalan server.

### FR-10 Response format consistency
API harus selalu mengembalikan JSON dengan struktur konsisten untuk semua produk valid.

### FR-11 API documentation
Backend harus menyediakan dokumentasi API interaktif menggunakan Swagger UI berbasis spesifikasi OpenAPI 3.1. Dokumentasi mencakup seluruh endpoint CRUD produk, schema request/response, status code, validasi, dan contoh error RFC 9457.

## 8. Validasi Input yang Diperlukan
Validasi payload berlaku untuk `POST /api/products` dan `PUT /api/products/:id`. Path `id` divalidasi untuk operasi yang menggunakan parameter tersebut. Data seed juga harus mematuhi schema yang sama.

### 8.1 Validasi umum
- `id` harus berupa angka integer positif
- Saat membuat produk, `id` tidak boleh dikirim client dan dibuat oleh backend; saat membaca/memperbarui/menghapus, `id` path harus berupa integer positif
- `name` wajib berupa string setelah trim, minimal 3 karakter dan maksimal 120 karakter
- `price` harus bernilai angka dan lebih besar dari 0; nilainya menggunakan currency code pada field `currency`
- `currency` wajib berupa kode alfabetik ISO 4217 tiga huruf kapital (misalnya `USD` atau `IDR`)
- `image` wajib berupa URL absolut yang valid dengan protokol `http` atau `https`
- `description` wajib berupa string setelah trim, minimal 20 karakter
- `price` dibatasi maksimal `9999999999.99` agar sesuai dengan tipe database `NUMERIC(12,2)`

### 8.2 Validasi variants
- `variants` harus berupa array dengan minimal satu item
- Setiap item harus memiliki `color` dan `size` berupa string non-kosong setelah trim serta `quantity` berupa bilangan bulat non-negatif
- Kombinasi `color` dan `size` tidak boleh duplikat pada produk yang sama
- Field wajib yang hilang, `null`, atau memiliki tipe salah harus ditolak
- Field tak dikenal di payload create/update harus ditolak untuk menghindari typo dan data yang tidak disengaja
- `isAvailable` adalah field response yang diturunkan backend: `true` jika total quantity seluruh variasi > 0, selain itu `false`; client tidak boleh mengirim field ini pada create/update

### 8.3 Format error response (RFC 9457)
Error menggunakan Problem Details for HTTP APIs (RFC 9457) dengan `Content-Type: application/problem+json`. Error validasi dapat menambahkan extension `errors` yang berisi detail per field.

```json
{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/products",
  "errors": {
    "price": ["Must be a number greater than 0"],
    "image": ["Must be a valid absolute HTTP or HTTPS URL"],
    "description": ["Must be at least 20 characters"]
  }
}
```

## 9. Konteks Teknis untuk Engineer
### 9.1 Arsitektur yang diharapkan
Sistem terdiri dari:
- Backend service Node.js/Express yang menyediakan API CRUD produk
- Frontend product detail page yang memanggil endpoint backend
- PostgreSQL sebagai sumber data produk dan variasinya

### 9.2 Flow integrasi
1. Frontend mengirim request ke endpoint katalog yang sesuai.
2. Backend memvalidasi path parameter dan request body sebelum mengubah data.
3. Backend membaca atau mengubah data produk dan variasi pada PostgreSQL.
4. Frontend menampilkan data ke komponen product gallery, price box, variant selector, dan description.

### 9.3 Endpoint yang wajib tersedia
#### GET /api/products/:id
- Tujuan: mengambil detail satu produk
- Parameter: `id` path param (angka)
- Response sukses: `200 OK`
- Response gagal: `400 Bad Request` jika `id` bukan integer positif; `404 Not Found` jika produk tidak ada

#### GET /api/products
- Tujuan: mengambil daftar semua produk
- Response sukses: `200 OK`, dengan `data` berupa array produk; jika belum ada produk, `data` adalah array kosong

#### POST /api/products
- Tujuan: membuat produk baru
- Request body: seluruh field editable (`name`, `price`, `currency`, `image`, `variants`, `description`); `id` dibuat backend dan `isAvailable` dihitung backend
- Response sukses: `201 Created`, `data` berisi produk baru termasuk `id` yang dibuat backend
- Response gagal: `400 Bad Request` jika payload tidak valid

#### PUT /api/products/:id
- Tujuan: mengganti seluruh field produk yang dapat diedit
- Parameter: `id` path param (angka); request body harus berisi seluruh field editable (`name`, `price`, `currency`, `image`, `variants`, `description`)
- Response sukses: `200 OK`, `data` berisi produk setelah diperbarui
- Response gagal: `400 Bad Request` jika path/body tidak valid; `404 Not Found` jika produk tidak ada
- `id` dan field turunan `isAvailable` dalam body tidak diperbolehkan; `id` hanya ditentukan oleh path dan `isAvailable` dihitung backend

#### DELETE /api/products/:id
- Tujuan: menghapus produk
- Parameter: `id` path param (angka)
- Response sukses: `204 No Content` tanpa response body
- Response gagal: `400 Bad Request` jika `id` bukan integer positif; `404 Not Found` jika produk tidak ada

#### Contoh request detail
```http
GET /api/products/1
```

#### Contoh request create
```http
POST /api/products
Content-Type: application/json

{
  "name": "Ultimate Bison Boot Sock",
  "price": 150000,
  "currency": "IDR",
  "image": "https://example.com/images/boot-sock.png",
  "variants": [
    { "color": "Coffee", "size": "S/M", "quantity": 8 },
    { "color": "Wild Green", "size": "M/L", "quantity": 4 }
  ],
  "description": "Kaus kaki boot tebal dengan bahan hangat, nyaman, dan tahan lama."
}
```

#### Header response create
```http
HTTP/1.1 201 Created
Location: /api/products/123
Content-Type: application/json
```

#### Contoh response sukses untuk endpoint detail/create/update
```json
{
  "data": {
    "id": 1,
    "name": "Ultimate Bison Boot Sock",
    "price": 150000,
    "currency": "IDR",
    "image": "https://example.com/images/boot-sock.png",
    "variants": [
      { "color": "Coffee", "size": "S/M", "quantity": 8 },
      { "color": "Wild Green", "size": "M/L", "quantity": 4 }
    ],
    "description": "Kaus kaki boot tebal dengan bahan hangat, nyaman, dan tahan lama.",
    "isAvailable": true
  }
}
```

#### Contoh response sukses untuk daftar
```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

#### Contoh response gagal
```json
{
  "type": "https://api.example.com/problems/product-not-found",
  "title": "Product not found",
  "status": 404,
  "detail": "No product exists with the requested id.",
  "instance": "/api/products/123",
  "code": "PRODUCT_NOT_FOUND"
}
```

### 9.4 Data contract dan aturan API
- Tidak ada satu standar universal untuk bentuk response sukses; API ini memakai envelope `data` yang konsisten, sedangkan error memakai standar formal RFC 9457
- Response sukses dengan body menggunakan envelope `data`; response daftar menambahkan `meta.total`
- Response error mengikuti RFC 9457, bukan envelope sukses; `errors` dan `code` merupakan extension API yang terdokumentasi
- Semua response body menggunakan JSON; error memakai media type `application/problem+json`
- Jangan mengirim field `success` atau pesan sukses yang berulang; status HTTP menyatakan hasil operasi
- `DELETE` sukses mengembalikan `204 No Content` tanpa response body
- `image` harus berupa URL yang valid dan dapat diakses frontend
- `variants` adalah array kombinasi warna/ukuran; setiap item menyimpan stoknya sendiri
- `isAvailable` diturunkan dari total stok semua kombinasi variasi
- `id` dibuat backend dan tidak dapat diubah melalui update
- `isAvailable` selalu dihitung backend dari total quantity seluruh variasi; nilainya tidak dapat diubah secara langsung
- Create/update tersimpan persisten di PostgreSQL dan tetap tersedia setelah server restart

### 9.5 Error mapping
| Kondisi | HTTP Status | Format error |
|---|---:|---|
| path parameter atau request body tidak valid | 400 | RFC 9457 Problem Details; extension `errors` untuk detail field |
| produk tidak ditemukan | 404 | RFC 9457 Problem Details; extension `code: "PRODUCT_NOT_FOUND"` |
| media type request tidak didukung | 415 | RFC 9457 Problem Details |
| server error | 500 | RFC 9457 Problem Details; tanpa stack trace atau detail internal |

### 9.6 Asumsi dan batasan implementasi
- Produk dan variasinya disimpan pada PostgreSQL dengan migration dan seed data
- Fokus utama adalah response JSON yang valid dan siap digunakan frontend
- Tidak perlu membangun auth, checkout, atau admin panel
- Field tambahan boleh ditambahkan selama tidak mengganggu struktur utama

### 9.7 Edge cases yang harus ditangani
- `id` bukan angka
- `id` tidak ditemukan
- payload create/update bukan JSON object atau body kosong
- client mengirim `id` pada body create/update
- payload berisi field tidak dikenal
- request daftar ketika koleksi produk kosong
- stok semua kombinasi bernilai 0; `isAvailable` menjadi `false`
- `price` bernilai 0 atau string tidak valid
- `currency` hilang atau bukan kode tiga huruf kapital
- `image` kosong atau bukan URL
- salah satu kombinasi variasi memiliki warna/ukuran kosong atau duplikat
- `description` terlalu pendek
- quantity salah satu variasi bernilai negatif

### 9.8 Acceptance criteria teknis tambahan
- Response sukses dengan body mengembalikan `Content-Type: application/json`
- Response error mengikuti RFC 9457 dan memakai `Content-Type: application/problem+json`
- Dokumentasi interaktif Swagger UI tersedia pada `GET /api-docs`; file spesifikasi OpenAPI tersedia pada `GET /api-docs/openapi.yaml`
- Spesifikasi OpenAPI mencakup seluruh endpoint CRUD, schema, request/response, status error, dan validasi yang ditetapkan PRD
- OpenAPI spec divalidasi dan diperbarui bersama perubahan kontrak API
- Response untuk produk valid selalu konsisten dengan format yang sama
- Error response tidak mengandung stack trace atau detail teknis yang tidak perlu
- API siap dipakai oleh frontend product detail tanpa transformasi data tambahan
- Data yang dibuat/diperbarui tersedia setelah request berikutnya dan setelah server restart

## 10. User Story
### US-01 Product discovery
Sebagai pelanggan, saya ingin melihat nama produk, harga, gambar, variasi, dan deskripsi agar saya dapat memahami produk sebelum membeli.

### US-02 Variant selection
Sebagai pelanggan, saya ingin melihat opsi warna dan ukuran agar saya dapat memilih varian yang sesuai.

### US-03 Product transparency
Sebagai pelanggan, saya ingin melihat stok/quantity agar saya mengetahui ketersediaan produk sebelum memutuskan checkout.

### US-04 Developer integration
Sebagai developer, saya ingin API yang konsisten dan terdokumentasi agar frontend dapat mengintegrasikannya tanpa bug data.

### US-05 Validation safety
Sebagai product owner, saya ingin validasi input diterapkan agar data produk yang dikirim tidak rusak atau tidak lengkap.

### US-06 Browse catalog
Sebagai pelanggan, saya ingin melihat daftar produk agar saya dapat menemukan produk yang ingin dilihat.

### US-07 Create product
Sebagai pengelola katalog, saya ingin menambahkan produk dengan data lengkap dan tervalidasi agar produk baru dapat ditampilkan di katalog.

### US-08 Update product
Sebagai pengelola katalog, saya ingin memperbarui informasi produk yang ada agar detail produk tetap akurat.

### US-09 Delete product
Sebagai pengelola katalog, saya ingin menghapus produk yang tidak lagi tersedia agar katalog tidak menampilkan produk tersebut.

### US-10 CRUD error feedback
Sebagai developer yang mengintegrasikan API, saya ingin menerima status code dan error terstruktur agar dapat menangani kegagalan request dengan benar.

### US-11 API documentation
Sebagai developer, saya ingin membaca dan mencoba endpoint melalui dokumentasi Swagger UI agar dapat memahami dan mengintegrasikan API tanpa menebak kontrak request/response.

### US-12 Currency-safe pricing
Sebagai pelanggan, saya ingin melihat kode mata uang yang sesuai dengan harga produk agar nominal harga tidak disalahartikan.

## 12. Acceptance Criteria
### AC-01 Product detail response
Ketika client mengirim request ke `GET /api/products/1`, sistem akan mengembalikan JSON dengan field `id`, `name`, `price`, `currency`, `image`, `variants`, dan `description`.

### AC-02 Price and image validation
Ketika payload `POST` atau `PUT` memiliki `price` kurang dari atau sama dengan 0 atau `image` bukan URL valid, sistem akan mengembalikan response `400 Bad Request` dengan pesan error yang jelas dan tidak mengubah koleksi produk.

### AC-03 Variant validation
Ketika payload `POST` atau `PUT` memiliki daftar variasi kosong atau kombinasi warna/ukuran tidak valid, stok negatif, atau variasi duplikat, sistem menolak request dan mengembalikan error validasi.

### AC-04 Product not found
Ketika produk dengan `id` yang diminta tidak tersedia, sistem akan mengembalikan `404 Not Found` dengan response Problem Details RFC 9457 dan `code: "PRODUCT_NOT_FOUND"`.

### AC-05 Description minimum length
Ketika payload `POST` atau `PUT` memiliki `description` kurang dari 20 karakter, sistem akan menolak input dan menampilkan pesan validasi yang spesifik.

### AC-06 Response consistency
Semua request valid untuk endpoint produk harus menghasilkan response JSON dengan struktur yang sama dan data yang konsisten.

### AC-07 UX compatibility
Frontend product detail page dapat menampilkan nama, harga, foto, varian, dan deskripsi secara otomatis dari response API tanpa kebutuhan hardcode.

### AC-08 List products
Ketika client mengirim `GET /api/products`, sistem mengembalikan `200 OK` dan `data` berupa array produk dengan schema yang konsisten. Jika belum ada produk, sistem mengembalikan `data: []`.

### AC-09 Create product
Ketika client mengirim `POST /api/products` dengan payload valid tanpa `id`, sistem menyimpan produk beserta seluruh variasi secara atomik di PostgreSQL, menghasilkan `id` unik, dan mengembalikan `201 Created` dengan header `Location` menuju resource baru serta response `{ "data": <product> }`. Produk tetap tersedia setelah server restart.

### AC-10 Reject invalid create payload
Ketika payload create memiliki field wajib yang hilang/salah tipe, nilai di luar batas, URL tidak valid, atau field tak dikenal, sistem mengembalikan `400 Bad Request` dengan Problem Details RFC 9457 dan detail error per field pada extension `errors`; produk tidak dibuat.

### AC-11 Update product
Ketika client mengirim `PUT /api/products/:id` dengan `id` valid yang ada dan seluruh field editable valid, sistem mengganti data produk beserta semua variasinya secara atomik dan mengembalikan `200 OK` dengan data terbaru.

### AC-12 Reject invalid update
Ketika body update tidak lengkap/tidak valid atau mencoba mengirim `id` maupun `isAvailable`, sistem mengembalikan `400 Bad Request` dengan Problem Details RFC 9457 dan data produk lama tidak berubah.

### AC-13 Delete product
Ketika client mengirim `DELETE /api/products/:id` untuk produk yang ada, sistem menghapus produk beserta variasinya dari PostgreSQL dan mengembalikan `204 No Content` tanpa body; produk tidak lagi muncul pada daftar atau detail.

### AC-14 Not found across item operations
Ketika client meminta detail, update, atau delete untuk `id` valid yang tidak ada, sistem mengembalikan `404 Not Found` dengan Problem Details RFC 9457 dan extension `code: "PRODUCT_NOT_FOUND"`.

### AC-15 Invalid path id
Ketika `id` path kosong, bukan integer, nol, atau negatif untuk operasi item, sistem mengembalikan `400 Bad Request` dengan Problem Details RFC 9457 dan tidak mengubah data.

### AC-16 Consistent JSON errors
Setiap error API mengikuti RFC 9457 dengan `type`, `title`, `status`, `detail`, dan `instance`; error validasi dapat mencakup extension `errors`, error not found mencakup `code`, dan tidak ada response error yang membocorkan stack trace.

### AC-17 Derived availability
Backend selalu menetapkan `isAvailable` menjadi `false` jika total quantity semua variasi adalah 0 dan `true` jika lebih dari 0; client tidak dapat menyetel atau mengubah field ini.

### AC-18 Swagger/OpenAPI documentation
Ketika developer membuka `GET /api-docs`, sistem menampilkan Swagger UI dari spesifikasi OpenAPI 3.1 yang valid. Spesifikasi mencakup seluruh endpoint CRUD produk, schema request/response, parameter, status code, dan error RFC 9457; file mentah dapat diambil dari `GET /api-docs/openapi.yaml`. Perubahan kontrak API harus tercermin pada spesifikasi yang divalidasi.

### AC-19 Product currency
Setiap produk yang dibuat, diperbarui, atau dibaca memiliki kode mata uang alfabetik ISO 4217 tiga huruf kapital. Harga ditafsirkan dalam mata uang tersebut, dan frontend memformat subtotal per currency code tanpa menjumlahkan nominal dari mata uang berbeda.

## 13. Success Metrics
- Tingkat keberhasilan API untuk request produk valid mencapai 100%
- Tidak ada response yang mengirim field kosong atau format data salah
- Error validasi mudah dipahami oleh developer dan user
- Integrasi frontend dengan API berjalan tanpa data mismatch

## 14. Kesimpulan
PRD ini fokus pada pembuatan API product detail yang memiliki struktur data jelas, validasi input yang kuat, dan integrasi yang mudah dengan frontend. Produk ini dirancang untuk memenuhi kebutuhan user saat melihat detail produk dan memastikan data yang dikirim ke UI selalu konsisten, aman, dan siap pakai.
