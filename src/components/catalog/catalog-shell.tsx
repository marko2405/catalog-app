"use client"

import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useChangeLocale } from "./locale-provider"

export function CatalogShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Catalog")
  const locale = useLocale()
  const changeLocale = useChangeLocale()
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 text-muted-foreground">{t("description")}</p></div>
        <div role="group" aria-label={t("language")} className="flex gap-1 rounded-lg border p-1">
          <Button variant={locale === "sr-Latn" ? "secondary" : "ghost"} aria-label={t("serbian")} aria-pressed={locale === "sr-Latn"} onClick={() => changeLocale("sr-Latn")}>SR</Button>
          <Button variant={locale === "en" ? "secondary" : "ghost"} aria-label={t("english")} aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</Button>
        </div>
      </header>
      {children}
    </main>
  )
}

export function CatalogError() {
  const t = useTranslations("Catalog")
  return (
    <div role="alert" className="rounded-xl border p-6">
      <p className="font-medium">{t("errorTitle")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("errorDescription")}</p>
      <form action="/" method="get"><Button type="submit" variant="outline" className="mt-4">{t("retry")}</Button></form>
    </div>
  )
}
