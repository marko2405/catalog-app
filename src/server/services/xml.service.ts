import "server-only"
import { XMLBuilder } from "fast-xml-parser"
import type { CatalogProduct } from "../../types/product.ts"

export function generateCatalogXml(products: readonly CatalogProduct[]): string {
  const builder = new XMLBuilder({ format: true, indentBy: "  ", suppressEmptyNode: true })
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build({
    proizvodi: {
      proizvod: products.map((product) => ({
        ean: product.ean,
        naziv: product.name,
        kategorija: product.category,
        brend: product.brand,
        dobavljac: product.supplier.name,
        lager: product.stockQuantity,
        nabavna_cena: product.purchasePrice,
        prodajna_cena: product.sellingPrice,
        zarada: product.profit,
        slike: product.images.length ? { slika: product.images } : "",
      })),
    },
  })
}
