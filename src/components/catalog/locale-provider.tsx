"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { NextIntlClientProvider } from "next-intl"
import { messages } from "@/i18n/messages"
import { localeCookie, type Locale } from "@/i18n/locales"

const LocaleContext = createContext<((locale: Locale) => void) | null>(null)

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = useState(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = messages[locale].Catalog.title
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages[locale].Catalog.description)
  }, [locale])

  function changeLocale(value: Locale) {
    document.cookie = `${localeCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
    setLocale(value)
  }

  return (
    <LocaleContext.Provider value={changeLocale}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Europe/Belgrade">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}

export function useChangeLocale() {
  const changeLocale = useContext(LocaleContext)
  if (!changeLocale) throw new Error("LocaleProvider is required")
  return changeLocale
}
