import { CatalogTable } from "@/components/catalog/catalog-table"
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
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Katalog proizvoda</h1>
        <div role="alert" className="mt-8 rounded-xl border p-6">
          <p className="font-medium">Katalog trenutno nije dostupan.</p>
          <p className="mt-2 text-sm text-muted-foreground">Pokušajte ponovo za nekoliko trenutaka.</p>
          <form action="/" method="get"><button type="submit" className="mt-4 cursor-pointer rounded underline underline-offset-4 focus-visible:outline-2">Pokušaj ponovo</button></form>
        </div>
      </main>
    )
  }
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Katalog proizvoda</h1>
        <p className="mt-2 text-muted-foreground">Objedinjene ponude dobavljača</p>
      </header>
      <CatalogTable products={catalog.products} suppliers={Object.values(suppliers).map(({ id, name }) => ({ id, name }))} />
    </main>
  )
}
