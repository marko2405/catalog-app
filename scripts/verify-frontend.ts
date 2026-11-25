import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "../src/server/services/catalog.service.ts"
import { getPricingConfig } from "../src/server/config/suppliers.ts"
import { filterProducts, formatRsd } from "../src/lib/catalog-view.ts"

test("search and supplier filtering use the complete real catalog without mutation", async () => {
  const { products } = await loadCatalog(getPricingConfig({}))
  const snapshot = JSON.stringify(products)
  assert.equal(filterProducts(products, "", "all").length, 52)
  for (const [supplier, count] of [["alfa", 14], ["beta", 9], ["gama", 29]] as const) {
    assert.equal(filterProducts(products, "  ", supplier).length, count)
  }
  for (const query of ["kamera Trust Tolar 1080p - web", "TRUST TOLAR", "  trust tolar  ", "8601005617419", "5617419"]) {
    assert.deepEqual(filterProducts(products, query, "all").map((product) => product.ean), ["8601005617419"])
    assert.equal(filterProducts(products, query, "alfa").length, 0)
    assert.equal(filterProducts(products, query, "gama").length, 1)
  }
  assert.equal(filterProducts(products, "nepostojeci-proizvod", "all").length, 0)
  assert.equal(filterProducts(products, "", "all").filter((product) => product.stockQuantity === 0).length, 9)
  assert.equal(JSON.stringify(products), snapshot)
})

test("RSD formatting changes separators only, without monetary arithmetic", () => {
  assert.equal(formatRsd("1000.00"), "1.000,00 RSD")
  assert.equal(formatRsd("12840.50"), "12.840,50 RSD")
  assert.equal(formatRsd("0.00"), "0,00 RSD")
  assert.equal(formatRsd("12345678901234567890.12"), "12.345.678.901.234.567.890,12 RSD")
})
