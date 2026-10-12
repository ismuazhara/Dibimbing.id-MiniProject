const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../src/app");
const { AppError } = require("../src/errors/app-error");

const validProduct = {
  name: "Ultimate Bison Boot Sock",
  price: 44,
  currency: "USD",
  image: "https://example.com/images/sock.png",
  variants: [
    { color: "Coffee", size: "S/M", quantity: 3 },
    { color: "Wild Green", size: "M/L", quantity: 0 }
  ],
  description: "Warm, cushioned boot socks made for cold-weather wear."
};

function createMemoryService() {
  const products = [];
  let nextId = 1;

  return {
    async list() {
      return products.map((product) => structuredClone(product));
    },
    async get(id) {
      const product = products.find((entry) => entry.id === id);
      if (!product) {
        throw new AppError(404, "Product not found", "No product exists with the requested id.", {
          code: "PRODUCT_NOT_FOUND"
        });
      }
      return product;
    },
    async create(input) {
      const product = {
        id: nextId++,
        ...structuredClone(input),
        isAvailable: input.variants.some((variant) => variant.quantity > 0)
      };
      products.push(product);
      return structuredClone(product);
    },
    async replace(id, input) {
      const index = products.findIndex((product) => product.id === id);
      if (index === -1) {
        throw new AppError(404, "Product not found", "No product exists with the requested id.", {
          code: "PRODUCT_NOT_FOUND"
        });
      }
      products[index] = {
        id,
        ...structuredClone(input),
        isAvailable: input.variants.some((variant) => variant.quantity > 0)
      };
      return structuredClone(products[index]);
    },
    async delete(id) {
      const index = products.findIndex((product) => product.id === id);
      if (index === -1) {
        throw new AppError(404, "Product not found", "No product exists with the requested id.", {
          code: "PRODUCT_NOT_FOUND"
        });
      }
      products.splice(index, 1);
      return true;
    }
  };
}

test("product API supports CRUD and uses consistent status and response formats", async (t) => {
  const service = createMemoryService();
  const quietLogger = { info() {}, error() {} };
  const app = createApp({
    productService: service,
    dbCheck: async () => {},
    logger: quietLogger
  });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${baseUrl}/api/products`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [], meta: { total: 0 } });

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validProduct)
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "/api/products/1");
  let body = await response.json();
  assert.equal(body.data.isAvailable, true);
  assert.equal(body.data.currency, validProduct.currency);
  assert.equal(body.data.variants.length, 2);

  response = await fetch(`${baseUrl}/api/products/1`);
  assert.equal(response.status, 200);
  body = await response.json();
  assert.equal(body.data.name, validProduct.name);
  assert.equal(body.data.currency, validProduct.currency);

  response = await fetch(`${baseUrl}/api/products/1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...validProduct,
      currency: "IDR",
      variants: [{ color: "Coffee", size: "S/M", quantity: 0 }]
    })
  });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.equal(body.data.isAvailable, false);
  assert.equal(body.data.currency, "IDR");
  assert.equal(body.data.variants[0].quantity, 0);

  response = await fetch(`${baseUrl}/api/products/1`, { method: "DELETE" });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");

  response = await fetch(`${baseUrl}/api/products/1`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "application/problem+json; charset=utf-8");
  body = await response.json();
  assert.equal(body.code, "PRODUCT_NOT_FOUND");
  assert.equal(body.status, 404);
});

test("invalid JSON, media type, body, and path ID return Problem Details", async (t) => {
  const app = createApp({
    productService: createMemoryService(),
    dbCheck: async () => {},
    logger: { info() {}, error() {} }
  });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not json"
  });
  assert.equal(response.status, 415);

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).title, "Invalid JSON");

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validProduct, extra: "not allowed" })
  });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.extra);

  response = await fetch(`${baseUrl}/api/products/1.5`);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).status, 400);

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validProduct, id: 8 })
  });
  assert.equal(response.status, 400);
});

test("health and Swagger routes are served", async (t) => {
  const app = createApp({
    productService: createMemoryService(),
    dbCheck: async () => {},
    logger: { info() {}, error() {} }
  });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${baseUrl}/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });

  response = await fetch(`${baseUrl}/health/ready`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ready" });

  response = await fetch(`${baseUrl}/api-docs/openapi.yaml`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/yaml/);
  assert.match(await response.text(), /openapi: 3\.1\.0/);

  response = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Swagger UI/);
});

test("database readiness and server failures return safe Problem Details", async (t) => {
  const loggedErrors = [];
  const app = createApp({
    productService: {
      async list() { return []; },
      async create(input) {
        if (input.name === "Conflict Product") {
          throw new AppError(409, "Conflict", "The requested product conflicts with existing data.", {
            code: "PRODUCT_CONFLICT"
          });
        }
        throw new Error("private database connection string");
      }
    },
    dbCheck: async () => { throw new Error("private database connection string"); },
    logger: { info() {}, error(message) { loggedErrors.push(message); } }
  });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${baseUrl}/health/ready`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).detail, "The database is not ready.");

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validProduct, name: "Conflict Product" })
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "PRODUCT_CONFLICT");

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validProduct)
  });
  assert.equal(response.status, 500);
  const problem = await response.json();
  assert.equal(problem.detail, "An unexpected error occurred.");
  assert.doesNotMatch(JSON.stringify(problem), /private database connection string/);
  assert.equal(loggedErrors.length, 2);

  response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{${" ".repeat(1024 * 1024)}`
  });
  assert.equal(response.status, 413);
});
