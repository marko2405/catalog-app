import "server-only"
import { getPricingConfig, type PricingConfig } from "../config/suppliers.ts"
import { loadAllSupplierOffers } from "./supplier.service.ts"
import { aggregateOffers } from "./aggregation.service.ts"
import { generateCatalogXml } from "./xml.service.ts"

export async function loadCatalog(config: PricingConfig = getPricingConfig(), applicationRoot = process.cwd()) {
  const results = await loadAllSupplierOffers(applicationRoot)
  const offers = results.flatMap((result) => result.offers)
  const issues = results.flatMap((result) => result.issues)
  const products = aggregateOffers(offers, config)
  return {
    products,
    xml: generateCatalogXml(products),
    issues,
    counts: {
      source: results.reduce((total, result) => total + result.sourceCount, 0),
      valid: offers.length,
      rejected: issues.length,
      duplicatesRemoved: offers.length - products.length,
      products: products.length,
    },
  }
}
