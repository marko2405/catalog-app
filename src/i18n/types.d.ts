import type serbian from "../../messages/sr-Latn.json"
import type { Locale as CatalogLocale } from "./locales"

declare module "next-intl" {
  interface AppConfig {
    Locale: CatalogLocale
    Messages: typeof serbian
  }
}
