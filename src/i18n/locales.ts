export const locales = ["sr-Latn", "en"] as const
export type Locale = (typeof locales)[number]
export const localeCookie = "catalog-locale"

export function resolveLocale(value: unknown): Locale {
  return value === "en" ? "en" : "sr-Latn"
}
