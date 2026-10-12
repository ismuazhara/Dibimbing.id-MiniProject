const { AppError } = require("../errors/app-error");

const productSelect = `
  SELECT
    p.id,
    p.name,
    p.price,
    p.currency_code AS currency,
    p.image_url AS image,
    p.description,
    COALESCE(
      json_agg(
        json_build_object(
          'color', pv.color,
          'size', pv.size,
          'quantity', pv.quantity
        ) ORDER BY pv.id
      ) FILTER (WHERE pv.id IS NOT NULL),
      '[]'::json
    ) AS variants,
    COALESCE(SUM(pv.quantity), 0) > 0 AS is_available
  FROM products p
  LEFT JOIN product_variants pv ON pv.product_id = p.id
`;

function mapProduct(row) {
  const price = Number(row.price);
  if (!Number.isFinite(price)) {
    throw new Error("Database returned an invalid product price.");
  }

  return {
    id: Number(row.id),
    name: row.name,
    price,
    currency: row.currency,
    image: row.image,
    variants: row.variants,
    description: row.description,
    isAvailable: row.is_available
  };
}

class ProductRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async list() {
    const result = await this.pool.query(
      `${productSelect}
       GROUP BY p.id
       ORDER BY p.id`
    );
    return result.rows.map(mapProduct);
  }

  async findById(id, executor = this.pool) {
    const result = await executor.query(
      `${productSelect}
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async create(input) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO products (name, price, currency_code, image_url, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.name, input.price, input.currency, input.image, input.description]
      );
      const id = inserted.rows[0].id;
      await this.insertVariants(client, id, input.variants);
      const product = await this.findById(id, client);
      await client.query("COMMIT");
      return product;
    } catch (error) {
      await this.rollback(client, error);
      throw this.mapConstraintError(error);
    } finally {
      client.release();
    }
  }

  async replace(id, input) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT id FROM products WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (!existing.rowCount) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `UPDATE products
         SET name = $1, price = $2, currency_code = $3, image_url = $4, description = $5, updated_at = NOW()
         WHERE id = $6`,
        [input.name, input.price, input.currency, input.image, input.description, id]
      );
      await client.query("DELETE FROM product_variants WHERE product_id = $1", [id]);
      await this.insertVariants(client, id, input.variants);

      const product = await this.findById(id, client);
      await client.query("COMMIT");
      return product;
    } catch (error) {
      await this.rollback(client, error);
      throw this.mapConstraintError(error);
    } finally {
      client.release();
    }
  }

  async delete(id) {
    const result = await this.pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rowCount > 0;
  }

  async insertVariants(executor, productId, variants) {
    for (const variant of variants) {
      await executor.query(
        `INSERT INTO product_variants (product_id, color, size, quantity)
         VALUES ($1, $2, $3, $4)`,
        [productId, variant.color, variant.size, variant.quantity]
      );
    }
  }

  async rollback(client, error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      error.rollbackError = rollbackError.message;
    }
  }

  mapConstraintError(error) {
    if (error.code === "23505") {
      return new AppError(409, "Conflict", "A product variant with this color and size already exists.", {
        code: "VARIANT_CONFLICT"
      });
    }
    return error;
  }
}

module.exports = { ProductRepository };
