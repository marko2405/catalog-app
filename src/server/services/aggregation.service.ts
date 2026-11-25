import "server-only"
import Decimal from "decimal.js"
import type { CatalogProduct, SupplierOffer } from "../../types/product.ts"
import type { PricingConfig } from "../config/suppliers.ts"
import { calculatePrices } from "./pricing.service.ts"

/** Input must be the validated offers from the supplier service. */
export function aggregateOffers(offers: readonly SupplierOffer[], config: PricingConfig): CatalogProduct[] {
  const selected = new Map<string, CatalogProduct>()
  for (const offer of offers) {
    const prices = calculatePrices(offer.purchasePrice, offer.supplier.id, config)
    const product: CatalogProduct = {
      ...offer,
      purchasePrice: prices.purchasePrice,
      sellingPrice: prices.sellingPrice,
      profit: prices.profit,
    }
    const current = selected.get(offer.ean)
    const comparison = current ? new Decimal(product.sellingPrice).comparedTo(current.sellingPrice) : -1
    if (!current || comparison < 0 || (comparison === 0 && product.supplier.id < current.supplier.id)) {
      selected.set(offer.ean, product)
    }
    // Same supplier and rounded price: retain the first source entry.
  }
  return [...selected.values()].sort((a, b) => a.ean < b.ean ? -1 : a.ean > b.ean ? 1 : 0)
}
