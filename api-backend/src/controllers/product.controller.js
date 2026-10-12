function createProductController(productService) {
  return {
    async list(req, res) {
      const products = await productService.list();
      res.status(200).json({
        data: products,
        meta: { total: products.length }
      });
    },

    async get(req, res) {
      const product = await productService.get(req.validatedProductId);
      res.status(200).json({ data: product });
    },

    async create(req, res) {
      const product = await productService.create(req.validatedProduct);
      res
        .status(201)
        .location(`/api/products/${product.id}`)
        .json({ data: product });
    },

    async replace(req, res) {
      const product = await productService.replace(
        req.validatedProductId,
        req.validatedProduct
      );
      res.status(200).json({ data: product });
    },

    async delete(req, res) {
      await productService.delete(req.validatedProductId);
      res.status(204).end();
    }
  };
}

module.exports = { createProductController };
