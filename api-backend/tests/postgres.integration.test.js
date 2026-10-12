const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { ProductRepository } = require("../src/repositories/product.repository");
const { ProductService } = require("../src/services/product.service");
const { createApp } = require("../src/app");

const productInput = {
  name: "Ultimate Bison Boot Sock",
  price: 44,
  currency: "USD",
  image: "https://example.com/images/sock.png",
  description: "Warm, cushioned boot socks made for cold-weather wear.",
  variants: [
    { color: "Coffee", size: "S/M", quantity: 4 },
    { color: "Wild Green", size: "M/L", quantity: 0 }
  ]
};

async function setupDatabase(t) {
  const database = new PGlite();
  t.after(() => database.close());
  const migrationDirectory = path.resolve(__dirname, "../migrations");
  const migrations = (await fs.readdir(migrationDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const migration of migrations) {
    await database.exec(await fs.readFile(path.join(migrationDirectory, migration), "utf8"));
  }

  function adaptResult(result) {
    return {
      rows: result.rows,
      rowCount: result.command === "SELECT" ? result.rows.length : result.affectedRows
    };
  }

  const pool = {
    async query(sql, values) {
      return adaptResult(await database.query(sql, values));
    },
    async connect() {
      return {
        async query(sql, values) {
          return adaptResult(await database.query(sql, values));
        },
        release() {}
      };
    }
  };
  const repository = new ProductRepository(pool);
  return { database, pool, repository, service: new ProductService(repository) };
}

test("currency migration backfills existing products with USD", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  const migrationsDirectory = path.resolve(__dirname, "../migrations");
  await database.exec(await fs.readFile(
    path.join(migrationsDirectory, "001_create_products.sql"),
    "utf8"
  ));
  await database.query(
    `INSERT INTO products (name, price, image_url, description)
     VALUES ($1, $2, $3, $4)`,
    [
      productInput.name,
      productInput.price,
      productInput.image,
      productInput.description
    ]
  );
  await database.exec(await fs.readFile(
    path.join(migrationsDirectory, "002_add_product_currency.sql"),
    "utf8"
  ));

  const result = await database.query("SELECT currency_code FROM products");
  assert.equal(result.rows[0].currency_code, "USD");
});

test("PostgreSQL schema migration and repository support persistent CRUD data shape", async (t) => {
  const { database, repository, service } = await setupDatabase(t);

  const created = await service.create(productInput);
  assert.ok(created.id > 0);
  assert.equal(created.price, 44);
  assert.equal(created.currency, "USD");
  assert.equal(created.isAvailable, true);
  assert.equal(created.variants.length, 2);

  const listed = await service.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].name, productInput.name);

  const replaced = await service.replace(created.id, {
    ...productInput,
    price: 45.25,
    currency: "IDR",
    variants: [{ color: "Coffee", size: "S/M", quantity: 0 }]
  });
  assert.equal(replaced.price, 45.25);
  assert.equal(replaced.currency, "IDR");
  assert.equal(replaced.isAvailable, false);
  assert.deepEqual(replaced.variants, [{ color: "Coffee", size: "S/M", quantity: 0 }]);

  assert.equal(await service.delete(created.id), undefined);
  assert.deepEqual(await service.list(), []);
  const variants = await database.query("SELECT id FROM product_variants");
  assert.equal(variants.rows.length, 0);
  assert.equal(await repository.findById(created.id), null);
});

test("PostgreSQL constraints and transaction rollback prevent partial product updates", async (t) => {
  const { database, repository, service } = await setupDatabase(t);
  const created = await service.create(productInput);

  await database.exec(`
    CREATE FUNCTION reject_test_variant() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.size = 'L/XL' THEN
        RAISE EXCEPTION 'simulated variant insert failure';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER reject_test_variant_insert
      BEFORE INSERT ON product_variants
      FOR EACH ROW EXECUTE FUNCTION reject_test_variant();
  `);

  await assert.rejects(repository.replace(created.id, {
    ...productInput,
    name: "Changed Product Name",
    variants: [
      { color: "Coffee", size: "S/M", quantity: 2 },
      { color: "Coffee", size: "L/XL", quantity: 1 }
    ]
  }), /simulated variant insert failure/);

  const unchanged = await service.get(created.id);
  assert.equal(unchanged.name, productInput.name);
  assert.deepEqual(unchanged.variants, productInput.variants);
});

test("PostgreSQL constraints reject invalid persisted values and duplicate variants", async (t) => {
  const { database, repository } = await setupDatabase(t);
  await assert.rejects(database.query(
    `INSERT INTO products (name, price, image_url, description)
     VALUES ($1, $2, $3, $4)`,
    ["Bad", 0, "https://example.com/image.png", productInput.description]
  ));

  await repository.create(productInput);
  await assert.rejects(database.query(
    `INSERT INTO products (name, price, currency_code, image_url, description)
     VALUES ($1, $2, $3, $4, $5)`,
    ["Bad Currency", 1, "usd", "https://example.com/image.png", productInput.description]
  ));
  await assert.rejects(repository.create({
    ...productInput,
    name: "Second Product",
    variants: [
      { color: "Coffee", size: "S/M", quantity: 1 },
      { color: "Coffee", size: "S/M", quantity: 2 }
    ]
  }), (error) => error.status === 409);

  const products = await repository.list();
  assert.equal(products.length, 1);
});

test("HTTP CRUD routes work end-to-end with PostgreSQL-backed repository", async (t) => {
  const { pool, service } = await setupDatabase(t);
  const app = createApp({
    productService: service,
    dbCheck: () => pool.query("SELECT 1"),
    logger: { info() {}, error() {} }
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productInput)
  });
  assert.equal(response.status, 201);
  const created = (await response.json()).data;
  assert.equal(response.headers.get("location"), `/api/products/${created.id}`);
  assert.equal(created.isAvailable, true);

  response = await fetch(`${baseUrl}/api/products`);
  assert.equal((await response.json()).meta.total, 1);

  response = await fetch(`${baseUrl}/api/products/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...productInput,
      variants: [{ color: "Coffee", size: "S/M", quantity: 0 }]
    })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.isAvailable, false);

  response = await fetch(`${baseUrl}/api/products/${created.id}`, { method: "DELETE" });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");

  response = await fetch(`${baseUrl}/api/products/${created.id}`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, "PRODUCT_NOT_FOUND");
});
