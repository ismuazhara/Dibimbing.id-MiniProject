# Product Detail Frontend

Vanilla HTML, CSS, and JavaScript storefront page integrated with the Product Catalog API.

## Run locally

1. Start PostgreSQL and follow the backend setup in [`../api-backend/README.md`](../api-backend/README.md).
2. Run the backend on its default address, `http://localhost:3000`, and apply migrations/seed data.
3. Serve this folder from `http://localhost:5500` (for example, with the VS Code Live Server extension). The backend's default CORS origin allows this address.
4. Open `http://localhost:5500/?productId=1`. The fresh development seed normally receives ID `1`; use the actual ID printed by the seed command when the database already contains products.

For local testing, the API base URL and product ID can be overridden with the `apiBaseUrl` and `productId` query parameters. For example: `http://localhost:5500/?apiBaseUrl=http%3A%2F%2Flocalhost%3A3000&productId=7`. Do not put credentials or secrets in the browser URL.

The page formats product and cart prices using each product's API `currency` code. The three demo recommendation items remain static USD examples. Mixed-currency cart subtotals are displayed separately; no exchange-rate conversion is attempted. The gallery uses the single `image` URL returned by the API; additional gallery photos require an API contract change.

## Tests

Run the API-client and error-format tests from this folder:

```powershell
node --test
```
