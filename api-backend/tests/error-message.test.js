const test = require("node:test");
const assert = require("node:assert/strict");
const { errorMessage } = require("../src/errors/error-message");

test("errorMessage reports nested causes when AggregateError has no message", () => {
  const error = new AggregateError([
    Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED"
    })
  ]);

  assert.equal(
    errorMessage(error),
    "connect ECONNREFUSED 127.0.0.1:5432"
  );
});

test("errorMessage falls back to useful error metadata", () => {
  assert.equal(errorMessage(Object.assign(new Error(""), { code: "ECONNREFUSED" })), "ECONNREFUSED");
  assert.equal(errorMessage(null), "Unknown error");
});
