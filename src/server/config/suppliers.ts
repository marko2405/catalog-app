import "server-only"
import Decimal from "decimal.js"
import type { Supplier, SupplierId } from "../../types/product.ts"

interface SupplierDefinition extends Supplier {
  fileName: string
  decimalSeparator: "." | ","
  marginVariable: string
  defaultMargin: string
}

export const suppliers: Readonly<Record<SupplierId, Readonly<SupplierDefinition>>> = {
  alfa: { id: "alfa", name: "Alfa Distribucija d.o.o.", fileName: "alfa_distribucija.xml", decimalSeparator: ".", marginVariable: "ALFA_MARGIN", defaultMargin: "0.05" },
  beta: { id: "beta", name: "Beta Trade d.o.o.", fileName: "beta_trade.xml", decimalSeparator: ".", marginVariable: "BETA_MARGIN", defaultMargin: "0.07" },
  gama: { id: "gama", name: "Gama Import d.o.o.", fileName: "gama_import.xml", decimalSeparator: ",", marginVariable: "GAMA_MARGIN", defaultMargin: "0" },
}

function readRate(name: string, value: string): string {
  const rate = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(rate) || !new Decimal(rate).isFinite()) {
    throw new Error(`${name} must be a finite, non-negative decimal rate (for example 0.05).`)
  }
  return rate
}

export function getPricingConfig(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const margin = (id: SupplierId) => {
    const supplier = suppliers[id]
    return readRate(supplier.marginVariable, environment[supplier.marginVariable] ?? supplier.defaultMargin)
  }
  return {
    vatRate: readRate("VAT_RATE", environment.VAT_RATE ?? "0.20"),
    margins: { alfa: margin("alfa"), beta: margin("beta"), gama: margin("gama") },
  }
}
