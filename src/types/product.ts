export type SupplierId = "alfa" | "beta" | "gama"

export interface Supplier {
  id: SupplierId
  name: string
}

export interface SupplierOffer {
  ean: string
  name: string
  category: string
  brand: string
  supplier: Supplier
  stockQuantity: number
  /** Exact decimal string in RSD, excluding VAT; no rounding. */
  purchasePrice: string
  images: string[]
}

export interface ProductValidationIssue {
  supplierId: SupplierId
  /** One-based position in the source file. */
  productIndex: number
  sku: string | null
  message: string
}

/** Callers must inspect issues before consuming a potentially incomplete feed. */
export interface SupplierParseResult {
  supplier: Supplier
  sourceCount: number
  offers: SupplierOffer[]
  issues: ProductValidationIssue[]
}
