const test = require("node:test");
const assert = require("node:assert/strict");
const { ProductRepository } = require("../src/repositories/product.repository");
const { AppError } = require("../src/errors/app-error");

const databaseProduct = {
  id: 7,
  name: "Ultimate Bison Boot Sock",
  price: "44.00",
  currency: "USD",
  image: "https://example.com/sock.png",
  description: "Warm, cushioned boot socks made for cold-weather wear.",
  variants: [{ color: "Coffee", size: "S/M", quantity: 3 }],
  is_available: true
};

test("repository maps PostgreSQL numeric and derived availability to API fields", async () => {
  const pool = {
    async query() {
      return { rows: [databaseProduct] };
    }
  };
  const repository = new ProductRepository(pool);
  const products = await repository.list();

  assert.equal(products[0].price, 44);
  assert.equal(products[0].currency, "USD");
  assert.equal(products[0].isAvailable, true);
  assert.deepEqual(products[0].variants, databaseProduct.variants);
});

test("repository create uses parameterized SQL and commits product with variants", async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes("INSERT INTO products")) return { rows: [{ id: 7 }], rowCount: 1 };
      if (sql.includes("SELECT") && sql.includes("FROM products p")) {
        return { rows: [databaseProduct], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {}
  };
  const pool = {
    async connect() {
      return client;
    }
  };
  const repository = new ProductRepository(pool);
  const product = await repository.create({
    name: databaseProduct.name,
    price: 44,
    currency: "USD",
    image: databaseProduct.image,
    description: databaseProduct.description,
    variants: databaseProduct.variants
  });

  assert.equal(product.id, 7);
  assert.ok(calls.some((call) => call.sql === "BEGIN"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
  assert.ok(calls.some((call) =>
    call.sql.includes("INSERT INTO products") &&
    call.values[2] === "USD"
  ));
  assert.ok(calls.some((call) =>
    call.sql.includes("INSERT INTO product_variants") &&
    call.values[0] === 7 &&
    call.values[1] === "Coffee"
  ));
});

test("repository rolls back on variant insert failure and maps uniqueness conflicts", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes("INSERT INTO product_variants")) {
        const error = new Error("duplicate key");
        error.code = "23505";
        throw error;
      }
      if (sql.includes("INSERT INTO products")) return { rows: [{ id: 7 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() {}
  };
  const repository = new ProductRepository({
    async connect() {
      return client;
    }
  });

  await assert.rejects(
    repository.create({
      name: databaseProduct.name,
      price: 44,
      currency: "USD",
      image: databaseProduct.image,
      description: databaseProduct.description,
      variants: databaseProduct.variants
    }),
    (error) => error instanceof AppError && error.status === 409
  );
  assert.ok(calls.includes("ROLLBACK"));
  assert.ok(!calls.includes("COMMIT"));
});
