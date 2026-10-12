const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatZodErrors,
  productIdSchema,
  productInputSchema
} = require("../src/schemas/product.schema");

const validProduct = {
  name: "Ultimate Bison Boot Sock",
  price: 44,
  currency: "USD",
  image: "https://example.com/images/sock.png",
  variants: [
    { color: "Coffee", size: "S/M", quantity: 4 },
    { color: "Wild Green", size: "M/L", quantity: 0 }
  ],
  description: "Warm, cushioned boot socks made for cold-weather wear."
};

test("product input accepts valid fields and trims strings", () => {
  const parsed = productInputSchema.parse({
    ...validProduct,
    name: "  Ultimate Bison Boot Sock  ",
    variants: [{ color: " Coffee ", size: " S/M ", quantity: 4 }]
  });

  assert.equal(parsed.name, "Ultimate Bison Boot Sock");
  assert.equal(parsed.variants[0].color, "Coffee");
});

test("product input rejects out-of-range price, non-HTTP image, and negative stock", () => {
  const parsed = productInputSchema.safeParse({
    ...validProduct,
    price: 10000000000,
    image: "ftp://example.com/sock.png",
    variants: [{ color: "Coffee", size: "S/M", quantity: -1 }]
  });

  assert.equal(parsed.success, false);
  const errors = formatZodErrors(parsed.error);
  assert.ok(errors.price);
  assert.ok(errors.image);
  assert.ok(errors["variants[0].quantity"]);
});

test("product input requires an uppercase three-letter currency code", () => {
  assert.equal(productInputSchema.parse(validProduct).currency, "USD");
  for (const currency of ["usd", "US", "USDD", "1SD", "", undefined]) {
    const parsed = productInputSchema.safeParse({ ...validProduct, currency });
    assert.equal(parsed.success, false, `${currency} should be rejected`);
    assert.ok(formatZodErrors(parsed.error).currency);
  }
});

test("product input rejects duplicate variants and unknown properties", () => {
  const parsed = productInputSchema.safeParse({
    ...validProduct,
    variants: [
      { color: "Coffee", size: "S/M", quantity: 1 },
      { color: " coffee ", size: "s/m", quantity: 2 }
    ],
    id: 4
  });

  assert.equal(parsed.success, false);
  const errors = formatZodErrors(parsed.error);
  assert.ok(errors["variants[1]"]);
  assert.ok(errors.id);
});

test("product ID accepts positive integer strings only", () => {
  assert.equal(productIdSchema.parse("42"), 42);
  for (const id of ["0", "-1", "1.2", "1x", "9007199254740992"]) {
    assert.equal(productIdSchema.safeParse(id).success, false);
  }
});
