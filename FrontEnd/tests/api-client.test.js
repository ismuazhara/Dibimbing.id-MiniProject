const test = require("node:test");
const assert = require("node:assert/strict");
const { createApiClient } = require("../api-client");

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body
  };
}

test("getProduct requests the configured product and unwraps the data envelope", async () => {
  const product = { id: 7, name: "Trail sock", variants: [] };
  const calls = [];
  const api = createApiClient({
    baseUrl: "http://localhost:3000/",
    fetchImpl: async (...args) => {
      calls.push(args);
      return jsonResponse(200, { data: product });
    }
  });

  assert.deepEqual(await api.getProduct("7"), product);
  assert.equal(calls[0][0], "http://localhost:3000/api/products/7");
  assert.equal(calls[0][1].headers.Accept, "application/json, application/problem+json");
});

test("request returns null for 204 without parsing a response body", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => ({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error("204 must not be parsed");
      }
    })
  });

  assert.equal(await api.request("/api/products/7"), null);
});

test("RFC 9457 field errors are formatted without losing their status", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => jsonResponse(400, {
      type: "about:blank",
      title: "Validation failed",
      detail: "One or more fields are invalid.",
      errors: { price: ["Must be greater than 0"], variants: ["Quantity is required"] }
    })
  });

  await assert.rejects(api.request("/api/products/7"), (error) => {
    assert.equal(error.status, 400);
    assert.match(error.message, /One or more fields are invalid\./);
    assert.match(error.message, /price: Must be greater than 0/);
    assert.match(error.message, /variants: Quantity is required/);
    return true;
  });
});

test("not-found errors retain their status for the product not-found state", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => jsonResponse(404, {
      title: "Not Found",
      detail: "Product with this ID was not found."
    })
  });

  await assert.rejects(api.getProduct(8), (error) => {
    assert.equal(error.status, 404);
    assert.match(error.message, /Product with this ID was not found/);
    return true;
  });
});

test("server errors and network failures never expose internal details", async () => {
  const serverError = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => jsonResponse(500, {
      title: "Internal Server Error",
      detail: "SQL password=super-secret failed"
    })
  });
  const networkError = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED with private connection data");
    }
  });

  await assert.rejects(serverError.request("/api/products/7"), (error) => {
    assert.equal(error.status, 500);
    assert.equal(error.message, "The product service couldn't complete the request. Please try again.");
    assert.doesNotMatch(error.message, /super-secret/);
    return true;
  });
  await assert.rejects(networkError.request("/api/products/7"), (error) => {
    assert.equal(error.status, 0);
    assert.match(error.message, /Check that the API is running/);
    assert.doesNotMatch(error.message, /private connection data/);
    return true;
  });
});

test("successful responses must include the API data envelope", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:3000",
    fetchImpl: async () => jsonResponse(200, { product: { id: 1 } })
  });

  await assert.rejects(api.getProduct(1), /invalid response/i);
});
