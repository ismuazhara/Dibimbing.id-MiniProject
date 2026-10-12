const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { seed } = require("../src/db/seed");

async function createTestPool(t) {
  const database = new PGlite();
  t.after(() => database.close());

  const migrationDirectory = path.resolve(__dirname, "../migrations");
  const migrations = (await fs.readdir(migrationDirectory))
    .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
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

  return {
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
    },
    async end() {},
    database
  };
}

test("seed inserts the product and all variants atomically and is safe to rerun", async (t) => {
  const pool = await createTestPool(t);
  const messages = [];
  const logger = { info(message) { messages.push(message); } };

  const productId = await seed({ pool, logger });
  assert.ok(productId > 0);

  let products = await pool.query(
    "SELECT id, name, price, currency_code FROM products WHERE id = $1",
    [productId]
  );
  assert.equal(products.rowCount, 1);
  assert.equal(products.rows[0].name, "Ultimate Bison Boot Sock");
  assert.equal(Number(products.rows[0].price), 44);
  assert.equal(products.rows[0].currency_code, "USD");

  let variants = await pool.query(
    "SELECT color, size, quantity FROM product_variants WHERE product_id = $1 ORDER BY id",
    [productId]
  );
  assert.equal(variants.rowCount, 4);
  assert.deepEqual(variants.rows.map(({ color, size, quantity }) => ({
    color,
    size,
    quantity
  })), [
    { color: "Coffee", size: "S/M", quantity: 8 },
    { color: "Coffee", size: "M/L", quantity: 6 },
    { color: "Wild Green", size: "S/M", quantity: 5 },
    { color: "Wild Green", size: "M/L", quantity: 4 }
  ]);

  const secondProductId = await seed({ pool, logger });
  assert.equal(secondProductId, productId);
  assert.equal((await pool.query("SELECT id FROM products")).rowCount, 1);
  assert.equal((await pool.query("SELECT id FROM product_variants")).rowCount, 4);
  assert.match(messages[1], /already exists/);
});

test("seed rolls back the product when inserting a variant fails", async (t) => {
  const pool = await createTestPool(t);
  await pool.database.exec(`
    CREATE FUNCTION reject_seed_variant() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.size = 'M/L' THEN
        RAISE EXCEPTION 'simulated seed variant failure';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER reject_seed_variant_insert
      BEFORE INSERT ON product_variants
      FOR EACH ROW EXECUTE FUNCTION reject_seed_variant();
  `);

  await assert.rejects(
    seed({ pool, logger: { info() {} } }),
    /simulated seed variant failure/
  );
  assert.equal((await pool.query("SELECT id FROM products")).rowCount, 0);
  assert.equal((await pool.query("SELECT id FROM product_variants")).rowCount, 0);
});
