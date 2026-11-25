import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { getPricingConfig, suppliers } from "../src/server/config/suppliers.ts"
import { parseSupplierXml } from "../src/server/parsers/supplier.parser.ts"
import { loadAllSupplierOffers, loadSupplierOffers } from "../src/server/services/supplier.service.ts"

test("actual feeds retain every valid offer, exact values, and duplicate EANs", async () => {
  const results = await loadAllSupplierOffers()
  const expected = { alfa: [41, 41, 0], beta: [39, 36, 3], gama: [42, 41, 1] }
  for (const result of results) {
    const definition = suppliers[result.supplier.id]
    const xml = await readFile(`data/${definition.fileName}`, "utf8")
    const entries = [...xml.matchAll(/<proizvod>([\s\S]*?)<\/proizvod>/g)]
    assert.deepEqual([result.sourceCount, result.offers.length, result.issues.length], expected[result.supplier.id])
    assert.equal(result.sourceCount, entries.length)
    const rejected = new Set(result.issues.map((issue) => issue.productIndex))
    let offerIndex = 0
    entries.forEach((entry, index) => {
      if (rejected.has(index + 1)) return
      const offer = result.offers[offerIndex++]
      const field = (name: string) => entry[1].match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1].trim()
      assert.equal(typeof offer.ean, "string")
      assert.equal(offer.ean, field("ean"))
      assert.equal(offer.name, field("naziv"))
      assert.equal(offer.category, field("kategorija"))
      assert.equal(offer.brand, field("brend"))
      assert.equal(offer.purchasePrice, field("cena")?.replace(",", "."))
      assert.equal(offer.stockQuantity, Number(field("lager")))
      assert.deepEqual(offer.images, [...entry[1].matchAll(/<slika>(.*?)<\/slika>/g)].map((match) => match[1]))
      assert.deepEqual(offer.supplier, { id: definition.id, name: definition.name })
    })
    console.log(JSON.stringify({ supplier: result.supplier, sourceCount: result.sourceCount, valid: result.offers.length, distinctEans: new Set(result.offers.map((offer) => offer.ean)).size, issues: result.issues, representative: result.offers[0] }))
  }
  const offers = results.flatMap((result) => result.offers)
  const distinct = new Set(offers.map((offer) => offer.ean))
  assert.equal(offers.length, 118)
  assert.equal(distinct.size, 52)
  assert.ok(offers.some((offer) => offer.stockQuantity === 0))
  assert.ok(offers.every((offer) => /[1-9]/.test(offer.purchasePrice)))
  assert.deepEqual(results.flatMap((result) => result.issues.map((issue) => issue.sku)), ["BT10077", "BT10126", "BT10231", "GM10077"])
  assert.deepEqual(offers.filter((offer) => offer.ean === "8601000548046").map((offer) => offer.supplier.id), ["alfa", "gama"])
  assert.deepEqual(offers.filter((offer) => offer.ean === "8601003562261").map((offer) => offer.supplier.id), ["gama"])
  console.log(JSON.stringify({ totalOffers: offers.length, distinctEans: distinct.size, zeroStock: offers.filter((offer) => offer.stockQuantity === 0).length, leadingZerosInSource: offers.filter((offer) => offer.ean.startsWith("0")).length }))
  await assert.rejects(loadSupplierOffers("alfa", "data/nonexistent"), /Cannot read UTF-8 supplier file/)
})

test("edge cases use in-memory mutations of actual source XML", async () => {
  const xml = await readFile("data/alfa_distribucija.xml", "utf8")
  const modified = xml
    .replace("<ean>8601005617419</ean>", "<ean> 0001005617419 </ean>")
    .replace("<naziv>Web kamera Trust Tolar 1080p</naziv>", "<naziv>Č ć Š š Ž ž Đ đ &amp; &lt; &quot; &#x411;</naziv>")
    .replace("<cena>2608.41</cena>", "<cena>12345678901234567890.12345678901234567890</cena>")
    .replace(/\s*<fotografija>[\s\S]*?<\/fotografija>/, "")
  const result = parseSupplierXml(modified, "alfa")
  assert.equal(result.issues.length, 0)
  assert.equal(result.offers[0].ean, "0001005617419")
  assert.equal(result.offers[0].name, 'Č ć Š š Ž ž Đ đ & < " Б')
  assert.equal(result.offers[0].purchasePrice, "12345678901234567890.12345678901234567890")
  assert.deepEqual(result.offers[0].images, [])
  assert.equal(parseSupplierXml(xml.replace(/<fotografija>[\s\S]*?<\/fotografija>/, "<fotografija/>"), "alfa").offers[0].images.length, 0)
  assert.throws(() => parseSupplierXml(xml.replace("</proizvodi>", ""), "alfa"), /malformed XML/)
  assert.throws(() => parseSupplierXml(xml.replaceAll("proizvodi", "wrongRoot"), "alfa"), /single proizvodi root/)
  assert.throws(() => parseSupplierXml(xml, "beta"), /does not match/)
  for (const [before, after, message] of [
    ["<ean>8601005617419</ean>", "<ean/>", "ean"],
    ["<ean>8601005617419</ean>", "", "ean"],
    ["<ean>8601005617419</ean>", "<ean> </ean>", "ean"],
    ["<lager>0</lager>", "<lager>-1</lager>", "lager"],
    ["<lager>0</lager>", "<lager>1.5</lager>", "lager"],
    ["<cena>2608.41</cena>", "<cena>NaN</cena>", "cena"],
    ["<cena>2608.41</cena>", "<cena>-1</cena>", "cena"],
    ["<cena>2608.41</cena>", "<cena>2,608.41</cena>", "cena"],
    ["<brend>Trust</brend>", "<brend/>", "brend"],
    ["<ean>8601005617419</ean>", "<ean>8601005617419</ean><ean>8601005617419</ean>", "ean"],
  ]) {
    const invalid = parseSupplierXml(xml.replace(before, after), "alfa")
    assert.equal(invalid.issues.length, 1)
    assert.equal(invalid.offers.length, 40)
    assert.match(invalid.issues[0].message, new RegExp(message))
    assert.equal(invalid.issues[0].sku, "AD10000")
  }
  const firstEntry = xml.match(/<proizvod>[\s\S]*?<\/proizvod>/)?.[0]
  assert.ok(firstEntry)
  const single = xml.replace(/<proizvod>[\s\S]*<\/proizvod>/, firstEntry)
  assert.equal(parseSupplierXml(single, "alfa").offers.length, 1)
  assert.equal(parseSupplierXml(single.replace(firstEntry, ""), "alfa").sourceCount, 0)
})

test("zero prices reject only the affected offer for both decimal separators", async () => {
  for (const supplierId of ["alfa", "gama"] as const) {
    const supplier = suppliers[supplierId]
    const xml = await readFile(`data/${supplier.fileName}`, "utf8")
    const baseline = parseSupplierXml(xml, supplierId)
    for (const price of ["0", "00", `0${supplier.decimalSeparator}00`, `000${supplier.decimalSeparator}000`, `-1${supplier.decimalSeparator}00`]) {
      const result = parseSupplierXml(xml.replace(/<cena>.*?<\/cena>/, `<cena>${price}</cena>`), supplierId)
      assert.deepEqual(result.offers, baseline.offers.slice(1))
      assert.equal(result.issues.length, baseline.issues.length + 1)
      assert.equal(result.issues[0].productIndex, 1)
      assert.match(result.issues[0].message, /cena:/)
    }
    const tinyPrice = `0${supplier.decimalSeparator}${"0".repeat(330)}1`
    const positive = parseSupplierXml(xml.replace(/<cena>.*?<\/cena>/, `<cena>${tinyPrice}</cena>`), supplierId)
    assert.equal(positive.offers.length, baseline.offers.length)
    assert.equal(positive.offers[0].purchasePrice, tinyPrice.replace(",", "."))
    assert.equal(positive.offers[0].stockQuantity, 0)
  }
})

test("configuration defaults, overrides, zero and invalid rates", () => {
  assert.deepEqual(getPricingConfig({}), { vatRate: "0.20", margins: { alfa: "0.05", beta: "0.07", gama: "0" } })
  assert.deepEqual(getPricingConfig({ VAT_RATE: "0", ALFA_MARGIN: "0", BETA_MARGIN: "0.12", GAMA_MARGIN: "0.03" }), { vatRate: "0", margins: { alfa: "0", beta: "0.12", gama: "0.03" } })
  for (const key of ["VAT_RATE", "ALFA_MARGIN", "BETA_MARGIN", "GAMA_MARGIN"]) {
    for (const value of ["", " ", "-0.01", "NaN", "Infinity", "5%", "0,05", "0.1junk", "1e2"]) {
      assert.throws(() => getPricingConfig({ [key]: value }), new RegExp(key))
    }
  }
  const previous = process.env.ALFA_MARGIN
  try {
    process.env.ALFA_MARGIN = "0.125"
    assert.equal(getPricingConfig().margins.alfa, "0.125")
  } finally {
    if (previous === undefined) delete process.env.ALFA_MARGIN
    else process.env.ALFA_MARGIN = previous
  }
})
