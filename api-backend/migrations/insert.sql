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