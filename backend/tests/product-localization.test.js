const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

function loadController(rows) {
  const calls = [];
  const controller = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../routes/products/productController.js"), "utf8"), {
    module: controller,
    require: () => ({ query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } }),
    console: { log() {} },
  });
  let body;
  const response = { json(value) { body = value; }, status() { return this; } };
  return { controller: controller.exports, calls, response, body: () => body };
}

test("catalog includes Arabic names and searches both languages with parameterized filters", async () => {
  const row = { id: 1, name: "Projector", ar_name: "جهاز عرض" };
  const context = loadController([row]);
  await context.controller.GetAllProducts({ query: { q: "جهاز", category: "2", page: "2" } }, context.response);
  const { sql, params } = context.calls[0];
  assert.match(sql, /SELECT id, name, ar_name,/);
  assert.match(sql, /\(name ILIKE \$1 OR ar_name ILIKE \$1\) AND category_id = \$2/);
  assert.equal(params[0], "%جهاز%");
  assert.equal(params[1], 2);
  assert.match(sql, /LIMIT 15 OFFSET 15/);
  assert.equal(context.body()[0].ar_name, row.ar_name);
});

test("details return all Arabic fields and include products without a category", async () => {
  const row = { id: 1, name: "Projector", ar_name: "جهاز عرض", ar_desc: "وصف", ar_key_features: "مميزات", category: null };
  const context = loadController([row]);
  await context.controller.GetProductDetails({ params: { id: "1" } }, context.response);
  for (const field of ["ar_name", "ar_desc", "ar_key_features"]) assert.ok(context.calls[0].sql.includes(`products.${field}`));
  assert.match(context.calls[0].sql, /LEFT JOIN categories/);
  assert.equal(context.calls[0].params[0], "1");
  assert.deepEqual(context.body(), row);
});
