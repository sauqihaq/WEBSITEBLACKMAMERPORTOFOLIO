import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  discountTotal,
  paymentState,
  validSignature,
} from "../src/lib/commerce";
import { projectSchema, siteSchema, productSchema } from "../src/lib/admin";
import { sameOrigin } from "../src/lib/security";
test("discounts use integer IDR, clamp percentage and never go negative", () => {
  assert.equal(discountTotal(199999, "PERCENT", 15), 29999);
  assert.equal(discountTotal(100, "FIXED", 500), 100);
  assert.equal(discountTotal(100, "PERCENT", 200), 100);
  assert.throws(() => discountTotal(1.2, "FIXED", 1));
  assert.throws(() => discountTotal(100, "FIXED", -1));
});
test("capture requires accepted fraud status; browser success is not a payment state", () => {
  assert.equal(paymentState("capture", "challenge"), "PENDING");
  assert.equal(paymentState("capture", "accept"), "PAID");
  assert.equal(paymentState("settlement"), "PAID");
  assert.equal(paymentState("success"), "PENDING");
  assert.equal(paymentState("expire"), "EXPIRED");
  assert.equal(paymentState("deny"), "FAILED");
  assert.equal(paymentState("partial_refund"), "REFUNDED");
});
test("Midtrans signature rejects tampered order, amount and malformed values", () => {
  const signature = createHash("sha512")
    .update("order-120020000.00test-secret")
    .digest("hex");
  assert.ok(
    validSignature("order-1", "200", "20000.00", signature, "test-secret"),
  );
  assert.equal(
    validSignature("order-1", "200", "1.00", signature, "test-secret"),
    false,
  );
  assert.equal(
    validSignature("order-2", "200", "20000.00", signature, "test-secret"),
    false,
  );
  assert.equal(
    validSignature("order-1", "200", "20000.00", "invalid", "test-secret"),
    false,
  );
});
test("CMS rejects active URL schemes and price injection", () => {
  const project = {
    title: "Example",
    slug: "example",
    category: "3D",
    description: "Text",
    cover: "javascript:alert(1)",
  };
  assert.equal(projectSchema.safeParse(project).success, false);
  assert.equal(
    projectSchema.safeParse({ ...project, cover: "//evil.example" }).success,
    false,
  );
  assert.equal(
    projectSchema.safeParse({ ...project, cover: "/safe.png" }).success,
    true,
  );
  assert.equal(
    productSchema.safeParse({
      ...project,
      cover: "/safe.png",
      sku: "EXAMPLE",
      prices: [
        { license: "Personal", terms: "Valid license terms", amount: -1 },
      ],
    }).success,
    false,
  );
});
test("same-origin mutation guard denies cross-site and missing Origin", () => {
  process.env.NEXTAUTH_URL = "https://studio.example";
  assert.throws(() =>
    sameOrigin(
      new Request("https://studio.example/api", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() => sameOrigin(new Request("https://studio.example/api")));
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("https://studio.example/api", {
        headers: { origin: "https://studio.example" },
      }),
    ),
  );
});
