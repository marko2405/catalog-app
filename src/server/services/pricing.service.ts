import "server-only"
import Decimal from "decimal.js"
import type { PricingConfig } from "../config/suppliers.ts"
import type { SupplierId } from "../../types/product.ts"

/** VAT collected is not profit. Keep this accounting assumption isolated. */
export function calculateProfit(netSellingPrice: Decimal, purchasePrice: Decimal): Decimal {
  return netSellingPrice.minus(purchasePrice)
}

export function calculatePrices(purchasePrice: string, supplierId: SupplierId, config: PricingConfig) {
  const margin = config.margins[supplierId]
  // Enough significant digits for exact fixed-decimal products, including long
  // fractional inputs. Do not mutate decimal.js's process-wide configuration.
  const Money = Decimal.clone({ precision: purchasePrice.length + margin.length + config.vatRate.length + 10, rounding: Decimal.ROUND_HALF_UP })
  const purchase = new Money(purchasePrice)
  const net = purchase.times(new Money(margin).plus(1))
  const selling = net.times(new Money(config.vatRate).plus(1))
  return {
    purchasePrice: purchase.toFixed(2, Decimal.ROUND_HALF_UP),
    netSellingPrice: net.toFixed(2, Decimal.ROUND_HALF_UP),
    sellingPrice: selling.toFixed(2, Decimal.ROUND_HALF_UP),
    profit: calculateProfit(net, purchase).toFixed(2, Decimal.ROUND_HALF_UP),
  }
}
