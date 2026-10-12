# Arsitektur – Product Catalog API

## 1. Tujuan dan ruang lingkup

Dokumen ini menjelaskan arsitektur backend CRUD katalog produk menggunakan Node.js dan PostgreSQL. Data yang disimpan dibatasi pada:

1. Nama produk
2. Harga produk
3. Foto produk
4. Variasi produk: warna, ukuran, dan jumlah/stok
5. Deskripsi produk

Database menjadi sumber data utama (source of truth). Dokumen ini menetapkan desain implementasi yang lebih baru daripada asumsi mock/in-memory dan database out-of-scope yang masih tertulis di PRD. Saat implementasi dimulai, PRD perlu diselaraskan dengan keputusan ini, terutama untuk persistensi, ID, dan struktur variasi.

## 2. Keputusan teknologi

| Area | Pilihan |
|---|---|
| Runtime | Node.js LTS |
| HTTP framework | Express.js |
| Database | PostgreSQL |
| Driver database | `pg` (`node-postgres`) |
| Validasi request | Zod |
| API specification | OpenAPI 3.1 |
| Interactive API docs | Swagger UI (`swagger-ui-express`) |
| OpenAPI parser | `yaml` |
| Konfigurasi | Environment variables |
| API format | JSON untuk sukses; RFC 9457 Problem Details untuk error |

Data foto disimpan sebagai URL, bukan file binary. File foto sebaiknya disimpan di object/file storage pada pengembangan berikutnya; database hanya menyimpan URL-nya.

## 3. Gambaran arsitektur

```text
Frontend / API client
        |
        | HTTP + JSON
        v
Express Router
        |
        v
Request validation (Zod)
        |
        v
Controller
        |
        v
Product Service
        |
        v
Product Repository (parameterized SQL via pg)
        |
        v
PostgreSQL
```

- **Router** memetakan HTTP method dan path ke controller.
- **Validation** memeriksa path parameter dan request body sebelum menjalankan operasi.
- **Controller** menerjemahkan HTTP request menjadi input service dan membentuk status/header/response.
- **Service** memuat aturan bisnis, transaksi create/update, dan aturan `isAvailable`.
- **Repository** menjalankan query SQL berparameter; tidak membangun SQL dengan menggabungkan input client.
- **PostgreSQL** menyimpan produk dan kombinasi variasinya secara relasional.
- Middleware error terpusat mengubah error aplikasi menjadi Problem Details tanpa membocorkan stack trace.

## 4. Struktur data dan relasi

Satu produk dapat memiliki satu atau lebih kombinasi warna/ukuran. Setiap kombinasi memiliki stok sendiri, sehingga variasi disimpan sebagai baris terpisah, bukan tiga nilai global pada satu object.

```text
products (1) ───────── (N) product_variants
```

### 4.1 Schema PostgreSQL

```sql
CREATE TABLE products (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    price       NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    image_url   TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT products_name_length
        CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
    CONSTRAINT products_price_positive
        CHECK (price > 0),
    CONSTRAINT products_currency_code_format
        CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT products_image_url_not_blank
        CHECK (char_length(btrim(image_url)) > 0),
    CONSTRAINT products_description_min_length
        CHECK (char_length(btrim(description)) >= 20)
);

CREATE TABLE product_variants (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color       VARCHAR(80) NOT NULL,
    size        VARCHAR(40) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT product_variants_color_not_blank
        CHECK (char_length(btrim(color)) > 0),
    CONSTRAINT product_variants_size_not_blank
        CHECK (char_length(btrim(size)) > 0),
    CONSTRAINT product_variants_quantity_nonnegative
        CHECK (quantity >= 0),
    CONSTRAINT product_variants_product_color_size_unique
        UNIQUE (product_id, color, size)
);

CREATE INDEX product_variants_product_id_idx
    ON product_variants (product_id);
```

### 4.2 Pertimbangan schema

- `NUMERIC(12, 2)` menghindari ketidakakuratan floating point untuk harga. API mengirim harga sebagai JSON number; implementasi harus mempertimbangkan bahwa driver `pg` biasanya mengembalikan `NUMERIC` sebagai string dan melakukan konversi terkontrol.
- Setiap harga disertai kode mata uang alfabetik ISO 4217 tiga huruf kapital. Migration `002_add_product_currency.sql` mengisi data lama dengan `USD`; data yang memakai mata uang lain harus diperbarui berdasarkan sumber bisnis.
- Frontend memformat harga dan mengelompokkan subtotal berdasarkan currency code, tanpa mengkonversi atau menjumlahkan mata uang berbeda.
- `image_url` menyimpan satu URL gambar utama sesuai kebutuhan minimum.
- Pasangan `(product_id, color, size)` harus unik agar kombinasi variasi tidak terduplikasi.
- Stok disimpan pada setiap kombinasi variasi. Jumlah stok total produk dihitung dari penjumlahan stok kombinasi.
- `isAvailable` adalah nilai turunan: produk tersedia jika jumlah `quantity` seluruh variasinya lebih dari nol. Nilai tersebut tidak disimpan terpisah.
- Foreign key `ON DELETE CASCADE` menghapus variasi saat produk dihapus.
- Batasan URL protokol (`http`/`https`) diperiksa oleh validasi aplikasi; constraint SQL menjaga agar nilainya tidak kosong. Constraint SQL bukan pengganti validasi URL.

## 5. Kontrak data API

### 5.1 Product

```json
{
  "id": 1,
  "name": "Ultimate Bison Boot Sock",
  "price": 150000,
  "currency": "IDR",
  "image": "https://example.com/images/boot-sock.png",
  "variants": [
    {
      "color": "Coffee",
      "size": "S/M",
      "quantity": 8
    },
    {
      "color": "Wild Green",
      "size": "M/L",
      "quantity": 4
    }
  ],
  "description": "Kaus kaki boot tebal dengan bahan hangat, nyaman, dan tahan lama.",
  "isAvailable": true
}
```

`isAvailable` dihitung dari stok seluruh variasi. Response tunggal dibungkus sebagai `{ "data": product }`; response daftar menggunakan `{ "data": products, "meta": { "total": n } }`.

### 5.2 CRUD endpoints

| Method | Path | Perilaku | Sukses |
|---|---|---|---|
| `GET` | `/api/products` | Mengambil daftar produk | `200 OK` |
| `GET` | `/api/products/:id` | Mengambil detail produk | `200 OK` |
| `POST` | `/api/products` | Membuat produk beserta variasi | `201 Created`, header `Location` |
| `PUT` | `/api/products/:id` | Mengganti seluruh field editable dan semua variasi | `200 OK` |
| `DELETE` | `/api/products/:id` | Menghapus produk beserta variasi | `204 No Content` |

Create dan update menerima field `name`, `price`, `currency`, `image`, `variants`, dan `description`. `currency` harus berupa kode alfabetik ISO 4217 tiga huruf kapital (contohnya `USD` atau `IDR`); `price` dinyatakan dalam mata uang tersebut. Client tidak boleh mengirim `id` atau `isAvailable`. Pada `PUT`, `variants` adalah daftar lengkap yang menggantikan daftar sebelumnya, bukan operasi patch.

### 5.3 Dokumentasi API dengan Swagger UI

- Spesifikasi API ditulis sebagai **OpenAPI 3.1** di `../docs/openapi.yaml` dan menjadi sumber dokumentasi yang ditinjau/diperbarui bersama perubahan endpoint.
- Swagger UI tersedia pada `GET /api-docs` dan menampilkan seluruh operasi CRUD, parameter, request body, response sukses, status error, schema produk/variasi, serta contoh request/response.
- Dokumen mentah tersedia di `GET /api-docs/openapi.yaml` dengan content type YAML yang sesuai.
- Express memuat spec dari `docs/openapi.yaml` dengan package `yaml`, lalu memasangnya pada `swagger-ui-express`; router dokumentasi dipasang sebelum fallback 404.
- `servers` pada OpenAPI menggunakan relative URL `/` agar Swagger UI berfungsi di local development maupun deployment di belakang reverse proxy; environment-specific base URL dapat ditentukan saat deployment bila diperlukan.
- Spesifikasi mendeskripsikan error RFC 9457 dengan media type `application/problem+json`, dan mencatat header `Location` untuk create serta response tanpa body untuk delete.
- Validasi spesifikasi OpenAPI dijalankan di CI atau test agar file YAML tetap valid. Perubahan kontrak endpoint harus memperbarui OpenAPI spec dalam pull request yang sama.
- Swagger UI tidak boleh menyediakan credential rahasia. Semua operasi tetap memanggil endpoint API aktual, bukan response contoh statis.
- Dokumentasi publik hanya menampilkan kontrak API, bukan data rahasia. Jika deployment kelak memerlukan pembatasan akses dokumentasi, tambahkan kontrol akses pada layer deployment tanpa mengubah kontrak API.

Contoh wiring Express:

```js
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");
const swaggerUi = require("swagger-ui-express");

const openApiPath = path.resolve(__dirname, "../../docs/openapi.yaml");
const openApiYaml = fs.readFileSync(openApiPath, "utf8");
const openApiSpec = yaml.parse(openApiYaml);

app.get("/api-docs/openapi.yaml", (req, res) => {
  res.type("application/yaml").send(openApiYaml);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
```

## 6. Validasi

Validasi request dijalankan sebelum service/repository mengakses atau mengubah data. Constraint PostgreSQL menjadi pertahanan tambahan agar aturan inti tetap terjaga bila ada jalur tulis lain.

| Input | Aturan |
|---|---|
| `id` | Path parameter harus digit integer positif; jangan menerima nilai desimal, nol, negatif, atau string kosong |
| `name` | String, di-trim, panjang 3–120 karakter |
| `price` | Angka finite lebih besar dari 0, maksimal 2 angka desimal |
| `image` | String URL absolut yang valid dengan protokol `http` atau `https` |
| `description` | String, di-trim, panjang minimal 20 karakter |
| `variants` | Array dengan minimal satu item |
| `variants[].color` | String, di-trim, tidak kosong, maksimal 80 karakter |
| `variants[].size` | String, di-trim, tidak kosong, maksimal 40 karakter |
| `variants[].quantity` | Integer non-negatif |
| Field ekstra | Ditolak; termasuk `id` dan `isAvailable` pada body create/update |
| Variasi duplikat | Kombinasi `color` dan `size` duplikat dalam produk yang sama ditolak |

Body kosong, JSON rusak, `null`, atau bukan JSON object ditolak. Jika ada validasi gagal, tidak ada perubahan parsial yang boleh tersimpan.

## 7. Transaksi dan aturan operasi

### Create

1. Validasi product fields dan daftar variasi.
2. Mulai transaksi.
3. Insert satu baris `products`.
4. Insert seluruh `product_variants` dengan `product_id` yang baru dibuat.
5. Commit transaksi; jika satu insert gagal, rollback semuanya.
6. Kembalikan resource baru beserta variasi dan header `Location`.

### Update (PUT)

1. Validasi `id`, field produk, dan semua variasi.
2. Mulai transaksi dan pastikan produk ada.
3. Update field pada `products`.
4. Ganti seluruh daftar variasi secara atomik (hapus lama, insert daftar baru).
5. Commit; jika ada kesalahan, rollback agar data lama tetap utuh.
6. Kembalikan versi produk yang telah diperbarui.

### Delete

Hapus produk berdasarkan `id`. Foreign key cascade menghapus semua variasi dalam transaksi yang sama. ID valid yang tidak ditemukan menghasilkan not found.

### Read

Query daftar/detail membaca produk beserta semua variasinya. Urutan daftar dan variasi harus deterministik (misalnya produk berdasarkan `id`, variasi berdasarkan `id`). Daftar kosong menghasilkan `200 OK` dengan `data: []`.

## 8. Format error

Error mengikuti RFC 9457 dengan `Content-Type: application/problem+json`. Contoh validasi:

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/products",
  "errors": {
    "price": ["Must be greater than 0"],
    "variants[1].quantity": ["Must be a non-negative integer"]
  }
}
```

| Kondisi | Status |
|---|---:|
| Path/body tidak valid atau JSON rusak | `400 Bad Request` |
| Produk tidak ditemukan | `404 Not Found` |
| Request mengirim media type yang tidak didukung | `415 Unsupported Media Type` |
| Konflik constraint/database yang dapat dijelaskan ke client | `409 Conflict` |
| Kesalahan tak terduga | `500 Internal Server Error` |

Error database tidak boleh mengungkap query, credential, struktur internal, atau stack trace kepada client. Detail teknis boleh dicatat melalui logger server dengan data sensitif disamarkan.

## 9. Struktur folder yang disarankan

```text
api-backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   └── product.routes.js
│   ├── controllers/
│   │   └── product.controller.js
│   ├── services/
│   │   └── product.service.js
│   ├── repositories/
│   │   └── product.repository.js
│   ├── schemas/
│   │   └── product.schema.js
│   ├── docs/
│   │   └── swagger.js
│   └── middleware/
│       ├── validate-request.js
│       └── error-handler.js
├── docs/
│   └── openapi.yaml
├── migrations/
│       ├── 001_create_products.sql
│       └── 002_add_product_currency.sql
├── tests/
│   ├── product.routes.test.js
│   ├── product.repository.test.js
│   └── openapi.test.js
├── .env.example
└── package.json
```

Migration berurutan membuat schema awal lalu menambah currency code agar database yang sudah memakai migration awal tetap dapat diperbarui tanpa mengedit migration historis. Schema tidak dibuat otomatis setiap server start; migration dijalankan secara eksplisit agar perubahan database dapat dilacak dan diulang.

## 10. Konfigurasi dan koneksi database

Konfigurasi minimal melalui environment variables:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://app_user:change_me@localhost:5432/product_catalog
```

- Jangan commit `.env` atau credential ke repository; sediakan `.env.example` dengan nilai placeholder.
- Gunakan satu `pg.Pool` per proses Node.js dan konfigurasi batas koneksi/timeouts yang sesuai lingkungan.
- Query wajib memakai parameter (`$1`, `$2`, ...) untuk mencegah SQL injection.
- Gunakan user database dengan hak minimum yang diperlukan aplikasi; migration dapat memakai user terpisah dengan hak DDL.
- Tutup pool dengan baik saat proses menerima shutdown signal.

## 11. Non-functional dan operasional

- **Keamanan:** validasi input, parameterized SQL, CORS dibatasi sesuai origin frontend, body size limit, secrets dari environment, dan error internal tidak diekspos.
- **Reliability:** transaksi untuk operasi multi-tabel; koneksi database gagal harus menghasilkan error server yang eksplisit, tidak berpura-pura sukses.
- **Maintainability:** route/controller/service/repository dipisah, schema database dikelola lewat migration.
- **Observability:** log request/error dengan request ID; jangan mencatat credential atau seluruh payload yang sensitif.
- **Performance:** index foreign key variasi dan gunakan query efisien untuk mengambil data produk beserta variasinya. Pagination dapat ditambahkan bila volume daftar membesar.

## 12. Strategi pengujian minimum

1. Unit test schema validasi: nilai valid dan setiap batas invalid.
2. Integration test repository/service dengan PostgreSQL test database.
3. API test untuk CRUD sukses, `400`, `404`, `409`, serta response Problem Details.
4. Verifikasi rollback: kegagalan insert salah satu variasi tidak meninggalkan produk/variasi parsial.
5. Verifikasi delete cascade dan perhitungan `isAvailable` dari stok kombinasi.
6. Validasi `docs/openapi.yaml` dan smoke test bahwa `/api-docs` serta `/api-docs/openapi.yaml` dapat diakses.

Test database harus terpisah dari database development dan hanya berisi data test yang dapat dihapus.

## 13. Keputusan yang perlu diselaraskan dengan PRD

- Mengganti asumsi in-memory/no database menjadi PostgreSQL dengan persistensi.
- Mengubah `variants` dari object berisi array warna/ukuran dan satu quantity menjadi array kombinasi warna-ukuran, masing-masing dengan quantity.
- Menetapkan `image` sebagai URL gambar utama (kolom `image_url`).
- Mempertahankan `isAvailable` sebagai nilai turunan dari total stok, bukan kolom database.
- Menyesuaikan deskripsi harga menjadi `NUMERIC(12,2)` dan mengonfirmasi mata uang yang dipakai sebelum production.
