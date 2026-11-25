import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveLocale } from "../src/i18n/locales.ts"
import { createTranslator } from "next-intl"
import english from "../messages/en.json" with { type: "json" }
import serbian from "../messages/sr-Latn.json" with { type: "json" }

test("both message files cover all keys, interpolate and pluralize correctly", () => {
  assert.deepEqual(Object.keys(english.Catalog).sort(), Object.keys(serbian.Catalog).sort())
  const en = createTranslator({ locale: "en", messages: english, namespace: "Catalog", onError: (error) => { throw error } })
  const sr = createTranslator({ locale: "sr-Latn", messages: serbian, namespace: "Catalog", onError: (error) => { throw error } })
  for (const t of [en, sr]) {
    for (const key of Object.keys(english.Catalog) as Array<keyof typeof english.Catalog>) {
      assert.ok(t.has(key))
      assert.ok(t(key, { start: 1, end: 10, count: 52, page: 1, name: "Trust Tolar" }))
    }
  }
  assert.equal(en("range", { start: 1, end: 10, count: 52 }), "Showing 1–10 of 52 products")
  assert.equal(en("range", { start: 1, end: 1, count: 1 }), "Showing 1–1 of 1 product")
  assert.equal(sr("range", { start: 51, end: 52, count: 52 }), "Prikazano 51–52 od 52 proizvoda")
  assert.equal(sr("total", { count: 1 }), "Katalog: 1 proizvod")
  assert.equal(sr("total", { count: 2 }), "Katalog: 2 proizvoda")
  assert.equal(sr("total", { count: 5 }), "Katalog: 5 proizvoda")
  assert.equal(resolveLocale(undefined), "sr-Latn")
  assert.equal(resolveLocale("invalid"), "sr-Latn")
  assert.equal(resolveLocale("sr-Latn"), "sr-Latn")
  assert.equal(resolveLocale("en"), "en")
})
