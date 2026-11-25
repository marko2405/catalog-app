import nextEnv from "@next/env"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { loadCatalog } from "../src/server/services/catalog.service.ts"

try {
  // Match next build/start by default; NODE_ENV=development selects dev files.
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development")
  const catalog = await loadCatalog()
  const destination = path.resolve(process.cwd(), "izvoz.xml")
  await writeFile(destination, catalog.xml, "utf8")
  console.log(`Generated ${destination}`)
  console.log(JSON.stringify(catalog.counts))
  for (const issue of catalog.issues) console.warn(issue.message)
} catch (error) {
  console.error("XML generation failed:", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
