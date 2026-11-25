import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { localeCookie, resolveLocale } from "./locales"
import { messages } from "./messages"

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(localeCookie)?.value)
  return { locale, messages: messages[locale], timeZone: "Europe/Belgrade" }
})
