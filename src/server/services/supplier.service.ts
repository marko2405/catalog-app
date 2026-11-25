import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { suppliers } from "../config/suppliers.ts"
import { parseSupplierXml } from "../parsers/supplier.parser.ts"
import type { SupplierId, SupplierParseResult } from "../../types/product.ts"

export async function loadSupplierOffers(supplierId: SupplierId, applicationRoot = process.cwd()): Promise<SupplierParseResult> {
  const filePath = path.resolve(applicationRoot, "data", suppliers[supplierId].fileName)
  let xml: string
  try {
    const bytes = await readFile(filePath)
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error(`Cannot read UTF-8 supplier file ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
  return parseSupplierXml(xml, supplierId)
}

/** Returns every valid offer plus explicit issues; does not deduplicate. */
export async function loadAllSupplierOffers(applicationRoot = process.cwd()): Promise<SupplierParseResult[]> {
  return Promise.all(Object.values(suppliers).map((supplier) => loadSupplierOffers(supplier.id, applicationRoot)))
}
