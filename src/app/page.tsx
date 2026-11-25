import { CatalogTable } from "@/components/catalog/catalog-table"
import { CatalogShell, CatalogError } from "@/components/catalog/catalog-shell"
import { suppliers } from "@/server/config/suppliers"
import { loadCatalog } from "@/server/services/catalog.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Home() {
  let catalog
  try {
    catalog = await loadCatalog()
  } catch (error) {
    console.error("Catalog loading failed:", error)
    return <CatalogShell><CatalogError /></CatalogShell>
  }
  return (
    <CatalogShell>
      <CatalogTable products={catalog.products} suppliers={Object.values(suppliers).map(({ id, name }) => ({ id, name }))} />
    </CatalogShell>
  )
}
