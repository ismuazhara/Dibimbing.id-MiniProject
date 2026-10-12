const express = require("express");
const { productInputSchema } = require("../schemas/product.schema");
const {
  requireJsonBody,
  validateProductBody,
  validateProductId
} = require("../middleware/validate-request");
const { createProductController } = require("../controllers/product.controller");

function createProductRouter(productService) {
  const router = express.Router();
  const controller = createProductController(productService);

  router.get("/", controller.list);
  router.post("/", requireJsonBody, validateProductBody(productInputSchema), controller.create);
  router.get("/:id", validateProductId, controller.get);
  router.put(
    "/:id",
    validateProductId,
    requireJsonBody,
    validateProductBody(productInputSchema),
    controller.replace
  );
  router.delete("/:id", validateProductId, controller.delete);

  return router;
}

module.exports = { createProductRouter };
