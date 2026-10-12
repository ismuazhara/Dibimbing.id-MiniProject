# Product Catalog API

Backend CRUD API built with Node.js, Express, and PostgreSQL. API contract and interactive docs use OpenAPI 3.1 and Swagger UI.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Create a PostgreSQL application role/database (use a strong local password), then copy `.env.example` to `.env` and set `DATABASE_URL`:

   ```sql
   CREATE ROLE product_api LOGIN PASSWORD 'replace-with-a-local-secret';
   CREATE DATABASE product_catalog OWNER product_api;
   ```

   Keep `.env` local; do not commit credentials.
3. Configure `CORS_ORIGIN` with the frontend origin. For a simple local static server, the example uses `http://localhost:5500`.
4. Apply migrations and seed the development product:

   ```powershell
   npm.cmd run migrate
   npm.cmd run seed
   ```

5. Start the API:

   ```powershell
   npm.cmd run dev
   ```

The server listens on the configured `PORT` (default `3000`). It checks PostgreSQL connectivity before listening and will fail clearly if the database is unavailable.

## API and documentation

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI YAML: `http://localhost:3000/api-docs/openapi.yaml`
- Liveness: `http://localhost:3000/health/live`
- Readiness (checks PostgreSQL): `http://localhost:3000/health/ready`
- CRUD operations: see [`docs/openapi.yaml`](./docs/openapi.yaml)

Product prices use `NUMERIC(12, 2)` in PostgreSQL and a JSON number in the API. Every product has a required three-letter uppercase ISO 4217 `currency` code; the development seed uses `USD` and `44.00` to match the existing product page. Migration `002_add_product_currency.sql` assigns `USD` to existing records. Review those records and update the code if their actual currency differs.

## Database commands

`npm run migrate` applies unapplied `.sql` files in `migrations/`, in filename order. Applied migration names are recorded in `schema_migrations`. Schema changes must be made with a new migration rather than editing an already-applied migration.

`npm run seed` inserts the sample product and its variants only if that product name does not already exist. It does not reset or delete existing data.

## Validation and tests

```powershell
npm.cmd test
npm.cmd run lint
```

The test suite uses an embedded PostgreSQL engine (PGlite) for migration, repository, transaction, and end-to-end API integration checks. It does not require a running PostgreSQL service and never connects to the development database.
