import { loadCatalog } from "../../../server/services/catalog.service.ts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const catalog = await loadCatalog()
    return new Response(catalog.xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="izvoz.xml"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Catalog export failed:", error)
    return Response.json({ error: "Unable to generate catalog export." }, { status: 500 })
  }
}
