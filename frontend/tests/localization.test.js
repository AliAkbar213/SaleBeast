import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCurrency, productText, translate, translatedError } from "../src/i18n/localization.js";

const product = {
  name: "Projector", ar_name: "جهاز عرض",
  desc: "English description", ar_desc: "وصف عربي",
  key_features: "English features", ar_key_features: "مميزات عربية",
};

test("each product field follows the selected language without changing the stored product", () => {
  const original = structuredClone(product);
  for (const field of ["name", "desc", "key_features"]) {
    assert.equal(productText(product, field, "ar"), product[`ar_${field}`]);
    assert.equal(productText(product, field, "en"), product[field]);
  }
  assert.deepEqual(product, original);
});

test("missing, null and blank Arabic fields fall back independently", () => {
  for (const value of [undefined, null, "", "  ", "\n\t"]) {
    assert.equal(productText({ ...product, ar_name: value }, "name", "ar"), "Projector");
    assert.equal(productText({ ...product, ar_desc: value }, "desc", "ar"), "English description");
    assert.equal(productText({ ...product, ar_key_features: value }, "key_features", "ar"), "English features");
  }
  assert.equal(productText({ ar_desc: "وصف عربي" }, "desc", "ar"), "وصف عربي");
  assert.equal(productText({ description: "Legacy description" }, "desc", "en"), "Legacy description");
  assert.equal(productText(null, "name", "ar"), "");
});

test("interface translations preserve dynamic product names and counts", () => {
  assert.equal(translate("ar", "Add {name} to cart", { name: "جهاز عرض" }), "إضافة جهاز عرض إلى السلة");
  assert.equal(translate("en", "Add {name} to cart", { name: "Projector" }), "Add Projector to cart");
  assert.equal(translate("ar", "{count} in cart", { count: 0 }), "0 في السلة");
  assert.equal(translate("ar", "Untranslated category"), "Untranslated category");
});

test("known errors translate while unknown Arabic errors get a readable fallback", () => {
  assert.equal(translatedError("ar", "Password is required"), "كلمة المرور مطلوبة");
  assert.equal(translatedError("ar", "database internals"), "حدث خطأ ما");
  assert.equal(translatedError("en", "Email or mobile number already in use"), "Email or mobile number already in use");
});

test("prices keep three decimals and the selected currency label", () => {
  assert.equal(formatCurrency("12.5", "en"), "12.500 KD");
  assert.match(formatCurrency("12.5", "ar"), /د\.ك$/);
  assert.match(formatCurrency(0, "ar"), /[0٠][.,٫][0٠]{3}/);
});
