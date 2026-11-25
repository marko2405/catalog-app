import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "../src/server/services/catalog.service.ts"
import { getPricingConfig } from "../src/server/config/suppliers.ts"
import { filterProducts, formatRsd, paginateProducts } from "../src/lib/catalog-view.ts"

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
  assert.equal(formatRsd("1250.50", "en"), "1,250.50 RSD")
  assert.equal(formatRsd("1250.50", "sr-Latn"), "1.250,50 RSD")
  assert.equal(formatRsd("12345678901234567890.12", "en"), "12,345,678,901,234,567,890.12 RSD")
  assert.equal(formatRsd("0.00", "en"), "0.00 RSD")
})

test("pagination follows complete-catalog filtering and clamps boundaries", async () => {
  const { products } = await loadCatalog(getPricingConfig({}))
  const collected = []
  for (let page = 1; page <= 6; page++) {
    const result = paginateProducts(products, page, 10)
    assert.equal(result.pageCount, 6)
    assert.equal(result.products.length, page === 6 ? 2 : 10)
    assert.equal(result.start, (page - 1) * 10 + 1)
    assert.equal(result.end, Math.min(page * 10, 52))
    collected.push(...result.products)
  }
  assert.deepEqual(collected, products)
  assert.equal(collected.filter((product) => product.stockQuantity === 0).length, 9)
  assert.equal(paginateProducts(products, 1, 25).pageCount, 3)
  assert.equal(paginateProducts(products, 3, 25).products.length, 2)
  assert.equal(paginateProducts(products, 1, 50).pageCount, 2)
  assert.equal(paginateProducts(products, 2, 50).products.length, 2)
  assert.equal(paginateProducts(products, 999, 10).page, 6)
  assert.equal(paginateProducts(products, -1, 10).page, 1)
  for (const [supplier, count, pages] of [["alfa", 14, 2], ["beta", 9, 1], ["gama", 29, 3]] as const) {
    const filtered = filterProducts(products, "", supplier)
    assert.equal(filtered.length, count)
    assert.equal(paginateProducts(filtered, 1, 10).pageCount, pages)
  }
  const search = filterProducts(products, "5617419", "gama")
  assert.equal(paginateProducts(search, 6, 10).products[0].ean, "8601005617419")
  assert.deepEqual(paginateProducts([], 6, 10), { page: 1, pageCount: 1, start: 0, end: 0, products: [] })
})

