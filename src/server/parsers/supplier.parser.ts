import "server-only"
import { XMLParser, XMLValidator } from "fast-xml-parser"
import { suppliers } from "../config/suppliers.ts"
import type { SupplierId, SupplierOffer, SupplierParseResult } from "../../types/product.ts"

function object(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected an XML element.`)
  }
  return value as Record<string, unknown>
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field}: expected a non-empty text value.`)
  }
  return value.trim()
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value]
}

function parseImages(value: unknown): string[] {
  if (value === undefined || value === "") return []
  const container = object(value, "fotografija")
  if (Object.keys(container).some((key) => key !== "slika")) {
    throw new Error("fotografija: expected only slika elements.")
  }
  if (container.slika === undefined) return []
  return array(container.slika).map((image) => {
    const url = requiredText(image, "fotografija.slika")
    let parsed: URL
    try { parsed = new URL(url) } catch { throw new Error("fotografija.slika: invalid image URL.") }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("fotografija.slika: expected an HTTP(S) URL.")
    }
    return url
  })
}

function normalizeProduct(product: Record<string, unknown>, supplierId: SupplierId): SupplierOffer {
  const supplier = suppliers[supplierId]
  const ean = requiredText(product.ean, "ean")
  // Do not enforce checksums: the supplied assignment codes are identifiers.
  if (!/^\d+$/.test(ean)) throw new Error("ean: expected digits only.")
  const price = requiredText(product.cena, "cena")
  const pricePattern = supplier.decimalSeparator === "," ? /^\d+(?:,\d+)?$/ : /^\d+(?:\.\d+)?$/
  if (!pricePattern.test(price)) throw new Error(`cena: expected a positive decimal using '${supplier.decimalSeparator}'.`)
  // Check the exact digits without converting to a potentially rounded number.
  if (!/[1-9]/.test(price)) throw new Error("cena: purchase price must be greater than zero.")
  const stock = requiredText(product.lager, "lager")
  if (!/^\d+$/.test(stock) || !Number.isSafeInteger(Number(stock))) {
    throw new Error("lager: expected a non-negative safe integer.")
  }
  return {
    ean,
    name: requiredText(product.naziv, "naziv"),
    category: requiredText(product.kategorija, "kategorija"),
    brand: requiredText(product.brend, "brend"),
    supplier: { id: supplier.id, name: supplier.name },
    stockQuantity: Number(stock),
    purchasePrice: price.replace(",", "."),
    images: parseImages(product.fotografija),
  }
}

/** All three feeds share the same schema, differing only in price separator. */
export function parseSupplierXml(xml: string, supplierId: SupplierId): SupplierParseResult {
  const supplier = suppliers[supplierId]
  const context = `${supplier.name} (${supplier.fileName})`
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new Error(`${context}: malformed XML at line ${validation.err.line}: ${validation.err.msg}`)
  }
  if (/<!DOCTYPE/i.test(xml)) throw new Error(`${context}: DTD declarations are not supported.`)
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false, trimValues: true, htmlEntities: true })
  const parsed: unknown = parser.parse(xml)
  const document = object(parsed, context)
  if (Object.keys(document).some((key) => key !== "?xml" && key !== "proizvodi")) {
    throw new Error(`${context}: expected a single proizvodi root.`)
  }
  const root = object(document.proizvodi, `${context}: proizvodi`)
  if (root["@_dobavljac"] !== supplier.name || root["@_valuta"] !== "RSD") {
    throw new Error(`${context}: supplier name or RSD currency attribute does not match configuration.`)
  }
  if (Object.keys(root).some((key) => !key.startsWith("@_") && key !== "proizvod")) {
    throw new Error(`${context}: unexpected element under proizvodi.`)
  }
  const products = root.proizvod === undefined ? [] : array(root.proizvod)
  const result: SupplierParseResult = {
    supplier: { id: supplier.id, name: supplier.name }, sourceCount: products.length, offers: [], issues: [],
  }
  products.forEach((value, index) => {
    let sku: string | null = null
    try {
      const product = object(value, "proizvod")
      if (typeof product.sku === "string") sku = product.sku.trim() || null
      result.offers.push(normalizeProduct(product, supplierId))
    } catch (error) {
      if (!(error instanceof Error)) throw error
      result.issues.push({ supplierId, productIndex: index + 1, sku, message: `${context}, product ${index + 1}${sku ? ` (${sku})` : ""}: ${error.message}` })
    }
  })
  return result
}
