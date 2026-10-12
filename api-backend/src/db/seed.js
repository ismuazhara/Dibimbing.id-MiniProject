const { loadConfig } = require("../config/env");
const { createPool } = require("../config/database");
const { errorMessage } = require("../errors/error-message");

const product = {
  name: "Ultimate Bison Boot Sock",
  price: 44,
  currency: "USD",
  image: "https://unitedbyblue.com/cdn/shop/files/8_a5dc6753-1ae4-45ed-8587-6a249f5233ed.jpg",
  description: "Warm, cushioned boot socks made for comfortable cold-weather wear.",
  variants: [
    { color: "Coffee", size: "S/M", quantity: 8 },
    { color: "Coffee", size: "M/L", quantity: 6 },
    { color: "Wild Green", size: "S/M", quantity: 5 },
    { color: "Wild Green", size: "M/L", quantity: 4 }
  ]
};

async function seed({ pool = createPool(loadConfig()), logger = console } = {}) {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [product.name]);

    const existing = await client.query(
      "SELECT id FROM products WHERE name = $1 ORDER BY id LIMIT 1",
      [product.name]
    );
    if (existing.rowCount) {
      await client.query("COMMIT");
      logger.info(`Seed product already exists with id ${existing.rows[0].id}`);
      return existing.rows[0].id;
    }

    const inserted = await client.query(
      `INSERT INTO products (name, price, currency_code, image_url, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [product.name, product.price, product.currency, product.image, product.description]
    );
    const productId = inserted.rows[0].id;

    for (const variant of product.variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, color, size, quantity)
         VALUES ($1, $2, $3, $4)`,
        [productId, variant.color, variant.size, variant.quantity]
      );
    }

    await client.query("COMMIT");
    logger.info(`Seeded product with id ${productId}`);
    return productId;
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Seed failed and the transaction could not be rolled back."
        );
      }
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function main() {
  let pool;
  try {
    pool = createPool(loadConfig());
    await seed({ pool });
  } catch (error) {
    console.error("Database seed failed:", errorMessage(error));
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seed };
