import type { CatalogProduct, SupplierId } from "../types/product.ts"

export type SupplierFilter = SupplierId | "all"

export function filterProducts(products: readonly CatalogProduct[], search: string, supplier: SupplierFilter): CatalogProduct[] {
  const query = search.trim().toLocaleLowerCase("sr-Latn")
  return products.filter((product) =>
    (supplier === "all" || product.supplier.id === supplier) &&
    (product.name.toLocaleLowerCase("sr-Latn").includes(query) || product.ean.includes(query))
  )
}

/** Format the server's two-decimal string without numeric conversion or rounding. */
export function formatRsd(value: string): string {
  const [whole, fraction] = value.split(".")
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction} RSD`
}
