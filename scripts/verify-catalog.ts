import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import nextEnv from "@next/env"
import Decimal from "decimal.js"
import { XMLParser, XMLValidator } from "fast-xml-parser"
import { getPricingConfig } from "../src/server/config/suppliers.ts"
import { calculatePrices } from "../src/server/services/pricing.service.ts"
import { aggregateOffers } from "../src/server/services/aggregation.service.ts"
import { generateCatalogXml } from "../src/server/services/xml.service.ts"
import { loadCatalog } from "../src/server/services/catalog.service.ts"
import { loadAllSupplierOffers } from "../src/server/services/supplier.service.ts"
import { GET } from "../src/app/api/export/route.ts"
import type { CatalogProduct } from "../src/types/product.ts"

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development")
const defaults = getPricingConfig({})
const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: false, htmlEntities: true, isArray: (name) => name === "proizvod" || name === "slika" })

function assertXml(xml: string, products: CatalogProduct[]) {
  assert.equal(XMLValidator.validate(xml), true)
  const parsed: unknown = parser.parse(xml)
  assert.deepEqual(parsed, {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    proizvodi: { proizvod: products.map((product) => ({
      ean: product.ean, naziv: product.name, kategorija: product.category,
      brend: product.brand, dobavljac: product.supplier.name, lager: String(product.stockQuantity),
      nabavna_cena: product.purchasePrice, prodajna_cena: product.sellingPrice, zarada: product.profit,
      slike: product.images.length ? { slika: product.images } : "",
    })) },
  })
  for (const product of products) {
    for (const value of [product.purchasePrice, product.sellingPrice, product.profit]) assert.match(value, /^\d+\.\d{2}$/)
  }
}

test("reference calculations, exact arithmetic, rounding and overrides", () => {
  for (const [supplier, net, selling, profit] of [
    ["alfa", "1050.00", "1260.00", "50.00"],
    ["beta", "1070.00", "1284.00", "70.00"],
    ["gama", "1000.00", "1200.00", "0.00"],
  ] as const) {
    assert.deepEqual(calculatePrices("1000.00", supplier, defaults), { purchasePrice: "1000.00", netSellingPrice: net, sellingPrice: selling, profit })
  }
  assert.equal(calculatePrices("0.10", "alfa", defaults).sellingPrice, "0.13")
  assert.equal(calculatePrices("0.10", "alfa", defaults).profit, "0.01")
  // Rounding net first would incorrectly produce 1.26 instead of 1.27.
  assert.equal(calculatePrices("1.004", "alfa", defaults).sellingPrice, "1.27")
  const noRates = getPricingConfig({ ALFA_MARGIN: "0", VAT_RATE: "0" })
  assert.equal(calculatePrices("1.005", "alfa", noRates).sellingPrice, "1.01")
  assert.equal(calculatePrices("123456789012345678901234567890.005", "alfa", noRates).sellingPrice, "123456789012345678901234567890.01")
  const overrides = getPricingConfig({ ALFA_MARGIN: "0.10", VAT_RATE: "0.25" })
  assert.deepEqual(calculatePrices("1000", "alfa", overrides), { purchasePrice: "1000.00", netSellingPrice: "1100.00", sellingPrice: "1375.00", profit: "100.00" })
})

test("actual catalog chooses minimum selling prices and preserves selected fields", async () => {
  const offers = (await loadAllSupplierOffers()).flatMap((result) => result.offers)
  const catalog = await loadCatalog(defaults)
  assert.deepEqual(catalog.counts, { source: 122, valid: 118, rejected: 4, duplicatesRemoved: 66, products: 52 })
  assert.equal(new Set(catalog.products.map((product) => product.ean)).size, 52)
  assert.deepEqual(catalog.issues.map((issue) => issue.sku), ["BT10077", "BT10126", "BT10231", "GM10077"])
  const winners = { alfa: 0, beta: 0, gama: 0 }
  for (const product of catalog.products) {
    const candidates = offers.filter((offer) => offer.ean === product.ean)
    const ranked = candidates.map((offer, index) => ({ offer, index, prices: calculatePrices(offer.purchasePrice, offer.supplier.id, defaults) }))
      .sort((a, b) => new Decimal(a.prices.sellingPrice).comparedTo(b.prices.sellingPrice) || a.offer.supplier.id.localeCompare(b.offer.supplier.id) || a.index - b.index)
    const winner = ranked[0]
    assert.deepEqual(product, { ...winner.offer, purchasePrice: winner.prices.purchasePrice, sellingPrice: winner.prices.sellingPrice, profit: winner.prices.profit })
    winners[product.supplier.id]++
  }
  assert.ok(catalog.products.some((product) => product.stockQuantity === 0))
  assert.ok(catalog.products.some((product) => product.ean === "8601000548046"))
  assert.ok(catalog.products.some((product) => product.ean === "8601003562261"))
  assertXml(catalog.xml, catalog.products)
  assert.equal((await loadCatalog(defaults)).xml, catalog.xml)
  assert.notEqual((await loadCatalog(getPricingConfig({ VAT_RATE: "0.25" }))).xml, catalog.xml)
  console.log(JSON.stringify({ counts: catalog.counts, selectedBySupplier: winners, zeroStock: catalog.products.filter((product) => product.stockQuantity === 0).length }))
  console.log(JSON.stringify(catalog.products.filter((product) => ["8601000548046", "8601003562261", "8601005617419"].includes(product.ean))))
})

test("selection uses selling prices, rounded ties and stable source order, regardless of stock", async () => {
  const offers = (await loadAllSupplierOffers()).flatMap((result) => result.offers)
  const base = offers[0]
  const alfa = { ...base, supplier: { id: "alfa", name: "Alfa Distribucija d.o.o." } } as const
  const gama = { ...base, supplier: { id: "gama", name: "Gama Import d.o.o." } } as const
  assert.equal(aggregateOffers([{ ...alfa, purchasePrice: "100", stockQuantity: 10 }, { ...gama, purchasePrice: "101", stockQuantity: 0 }], defaults)[0].supplier.id, "gama")
  const tie = [{ ...gama, purchasePrice: "105.001" }, { ...alfa, purchasePrice: "100" }]
  assert.equal(aggregateOffers(tie, defaults)[0].supplier.id, "alfa")
  assert.deepEqual(aggregateOffers(tie, defaults), aggregateOffers([...tie].reverse(), defaults))
  const sameSupplier = [{ ...alfa, purchasePrice: "100", name: "First source entry" }, { ...alfa, purchasePrice: "100", name: "Second source entry" }]
  assert.equal(aggregateOffers(sameSupplier, defaults)[0].name, "First source entry")
})

test("XML round trips leading zeros, Unicode, special characters, and missing images", async () => {
  const { products } = await loadCatalog(defaults)
  const modified = products.slice(0, 3).map((product, index) => ({ ...product, ean: `000${index}`, name: 'Č ć Š š Ž ž Đ đ Б & < > " \'', images: index === 0 ? [] : ["https://example.com/image?a=1&b=2", ...product.images] }))
  assertXml(generateCatalogXml(modified), modified)
})

test("route returns shared catalog, respects environment and handles errors", async () => {
  const response = await GET()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8")
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="izvoz.xml"')
  assert.equal(await response.text(), (await loadCatalog()).xml)
  const original = process.env.VAT_RATE
  const log = console.error
  try {
    process.env.VAT_RATE = "0.25"
    assert.equal(await (await GET()).text(), (await loadCatalog()).xml)
    process.env.VAT_RATE = "invalid"
    console.error = () => {}
    const failure = await GET()
    assert.equal(failure.status, 500)
    assert.deepEqual(await failure.json(), { error: "Unable to generate catalog export." })
  } finally {
    console.error = log
    if (original === undefined) delete process.env.VAT_RATE
    else process.env.VAT_RATE = original
  }
})

test("physical export matches the shared catalog and optional live HTTP endpoint", async () => {
  const catalog = await loadCatalog()
  const file = await readFile("izvoz.xml", "utf8")
  assert.equal(file, catalog.xml)
  assertXml(file, catalog.products)
  if (process.env.EXPORT_TEST_URL) {
    const response = await fetch(process.env.EXPORT_TEST_URL)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8")
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="izvoz.xml"')
    assert.equal(await response.text(), catalog.xml)
    console.log(`Live endpoint verified: ${process.env.EXPORT_TEST_URL}`)
  }
})
