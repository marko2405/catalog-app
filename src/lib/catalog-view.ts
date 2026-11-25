import type { CatalogProduct, SupplierId } from "../types/product.ts"
import type { Locale } from "../i18n/locales.ts"

export type SupplierFilter = SupplierId | "all"

export function filterProducts(products: readonly CatalogProduct[], search: string, supplier: SupplierFilter): CatalogProduct[] {
  const query = search.trim().toLocaleLowerCase("sr-Latn")
  return products.filter((product) =>
    (supplier === "all" || product.supplier.id === supplier) &&
    (product.name.toLocaleLowerCase("sr-Latn").includes(query) || product.ean.includes(query))
  )
}

/** Format the server's two-decimal string without numeric conversion or rounding. */
export function formatRsd(value: string, locale: Locale = "sr-Latn"): string {
  const [whole, fraction] = value.split(".")
  const group = locale === "en" ? "," : "."
  const decimal = locale === "en" ? "." : ","
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, group)}${decimal}${fraction} RSD`
}

export const pageSizes = [10, 25, 50] as const
export type PageSize = (typeof pageSizes)[number]

export function paginateProducts(products: readonly CatalogProduct[], requestedPage: number, pageSize: PageSize) {
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize))
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1))
  const offset = (page - 1) * pageSize
  return {
    page, pageCount,
    start: products.length === 0 ? 0 : offset + 1,
    end: Math.min(offset + pageSize, products.length),
    products: products.slice(offset, offset + pageSize),
  }
}
