const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const SwaggerParser = require("@apidevtools/swagger-parser");

test("OpenAPI document validates and declares all product CRUD operations", async () => {
  const specPath = path.resolve(__dirname, "../docs/openapi.yaml");
  const spec = await SwaggerParser.validate(specPath);

  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.paths["/api/products"].get);
  assert.ok(spec.paths["/api/products"].post);
  assert.ok(spec.paths["/api/products/{id}"].get);
  assert.ok(spec.paths["/api/products/{id}"].put);
  assert.ok(spec.paths["/api/products/{id}"].delete);
  assert.ok(spec.components.schemas.ProductInput.required.includes("currency"));
  assert.ok(spec.components.schemas.Product.required.includes("currency"));
});
