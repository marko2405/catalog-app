"use client"

import { useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react"
import type { CatalogProduct, Supplier } from "@/types/product"
import { filterProducts, formatRsd, paginateProducts, pageSizes, type PageSize, type SupplierFilter } from "@/lib/catalog-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductThumbnail } from "./product-thumbnail"

export function CatalogTable({ products, suppliers }: { products: CatalogProduct[]; suppliers: Supplier[] }) {
  const t = useTranslations("Catalog")
  const locale = useLocale()
  const format = useFormatter()
  const [search, setSearch] = useState("")
  const [supplier, setSupplier] = useState<SupplierFilter>("all")
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const matching = filterProducts(products, search, supplier)
  const pagination = paginateProducts(matching, page, pageSize)
  const options = [{ value: "all", label: t("allSuppliers") }, ...suppliers.map(({ id, name }) => ({ value: id, label: name }))]
  const hasFilters = search !== "" || supplier !== "all"
  const columns = ["image", "name", "ean", "supplier", "purchasePrice", "sellingPrice", "profit", "stock"] as const

  function changeSearch(value: string) { setSearch(value); setPage(1) }
  function clearFilters() { setSearch(""); setSupplier("all"); setPage(1) }

  return (
    <section aria-label={t("overview")} className="min-w-0">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <div className="min-w-0 flex-1 sm:min-w-64">
          <label htmlFor="catalog-search" className="mb-2 block text-sm font-medium">{t("searchLabel")}</label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input id="catalog-search" type="search" value={search} onChange={(event) => changeSearch(event.target.value)} placeholder={t("searchPlaceholder")} className="h-10 pr-10 pl-9" />
            {search && <Button variant="ghost" size="icon" aria-label={t("clearSearch")} className="absolute top-1 right-1" onClick={() => changeSearch("")}><X aria-hidden="true" /></Button>}
          </div>
        </div>
        <div className="sm:w-64">
          <label id="supplier-label" htmlFor="supplier-filter" className="mb-2 block text-sm font-medium">{t("supplier")}</label>
          <Select<SupplierFilter> value={supplier} items={options} onValueChange={(value) => { if (value) { setSupplier(value); setPage(1) } }}>
            <SelectTrigger id="supplier-filter" aria-labelledby="supplier-label" className="h-10 w-full"><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <a href="/api/export" download="izvoz.xml" className={buttonVariants({ className: "h-10 gap-2 px-4" })}>
          <Download aria-hidden="true" />{t("download")}
        </a>
      </div>
      <div className="my-5 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <p role="status" aria-live="polite">{t("range", { start: pagination.start, end: pagination.end, count: matching.length })}</p>
          {hasFilters && <p className="mt-1 text-xs text-muted-foreground">{t("total", { count: products.length })}</p>}
        </div>
        {hasFilters && <Button variant="ghost" onClick={clearFilters}>{t("clearFilters")}</Button>}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[1080px]">
          <TableCaption className="sr-only">{t("caption")}</TableCaption>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((key, index) => <TableHead key={key} scope="col" className={`px-4 py-3 ${index >= 4 ? "text-right" : ""}`}>{t(key)}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.products.map((product) => (
              <TableRow key={product.ean}>
                <TableCell className="px-4 py-3"><ProductThumbnail src={product.images[0]} name={product.name} /></TableCell>
                <TableCell className="min-w-60 max-w-80 px-4 py-3 font-medium whitespace-normal">{product.name}</TableCell>
                <TableCell className="px-4 font-mono text-xs tabular-nums">{product.ean}</TableCell>
                <TableCell className="px-4 text-muted-foreground">{product.supplier.name}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatRsd(product.purchasePrice, locale)}</TableCell>
                <TableCell className="px-4 text-right font-medium tabular-nums">{formatRsd(product.sellingPrice, locale)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatRsd(product.profit, locale)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  <span className={product.stockQuantity === 0 ? "rounded bg-muted px-2 py-1 text-muted-foreground" : ""}>{format.number(product.stockQuantity)}{product.stockQuantity === 0 && <span className="sr-only"> — {t("outOfStock")}</span>}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {matching.length === 0 && <div className="border-t px-6 py-12 text-center"><p>{t("empty")}</p>{hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>{t("clearFilters")}</Button>}</div>}
        <footer className="flex flex-col gap-4 border-t bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <label id="page-size-label" htmlFor="page-size" className="text-sm text-muted-foreground">{t("rowsPerPage")}</label>
            <Select<PageSize> value={pageSize} onValueChange={(value) => { if (value) { setPageSize(value); setPage(1) } }}>
              <SelectTrigger id="page-size" aria-labelledby="page-size-label" className="w-20 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>{pageSizes.map((size) => <SelectItem key={size} value={size}>{format.number(size)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <nav aria-label={t("pagination")} className="flex flex-wrap items-center gap-1">
            <Button variant="outline" disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)}><ChevronLeft aria-hidden="true" />{t("previous")}</Button>
            {Array.from({ length: pagination.pageCount }, (_, index) => index + 1).map((number) => (
              <Button key={number} variant={number === pagination.page ? "default" : "ghost"} size="icon" aria-label={t("pageLabel", { page: number })} aria-current={number === pagination.page ? "page" : undefined} onClick={() => setPage(number)}>{format.number(number)}</Button>
            ))}
            <Button variant="outline" disabled={pagination.page === pagination.pageCount} onClick={() => setPage(pagination.page + 1)}>{t("next")}<ChevronRight aria-hidden="true" /></Button>
          </nav>
        </footer>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("priceNote")}</p>
    </section>
  )
}
