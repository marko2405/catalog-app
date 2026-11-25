"use client"

import { useState } from "react"
import { Download, Search, X } from "lucide-react"
import type { CatalogProduct, Supplier } from "@/types/product"
import { filterProducts, formatRsd, type SupplierFilter } from "@/lib/catalog-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductThumbnail } from "./product-thumbnail"

export function CatalogTable({ products, suppliers }: { products: CatalogProduct[]; suppliers: Supplier[] }) {
  const [search, setSearch] = useState("")
  const [supplier, setSupplier] = useState<SupplierFilter>("all")
  const visible = filterProducts(products, search, supplier)
  const options = [{ value: "all", label: "Svi dobavljači" }, ...suppliers.map(({ id, name }) => ({ value: id, label: name }))]
  const hasFilters = search !== "" || supplier !== "all"

  return (
    <section aria-label="Pregled proizvoda" className="min-w-0">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <div className="min-w-0 flex-1 sm:min-w-64">
          <label htmlFor="catalog-search" className="mb-2 block text-sm font-medium">Pretraga proizvoda</label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraga po nazivu ili EAN kodu" className="h-10 pr-10 pl-9" />
            {search && <Button variant="ghost" size="icon" aria-label="Obriši pretragu" className="absolute top-1 right-1" onClick={() => setSearch("")}><X aria-hidden="true" /></Button>}
          </div>
        </div>
        <div className="sm:w-64">
          <label id="supplier-label" htmlFor="supplier-filter" className="mb-2 block text-sm font-medium">Dobavljač</label>
          <Select<SupplierFilter> value={supplier} items={options} onValueChange={(value) => { if (value) setSupplier(value) }}>
            <SelectTrigger id="supplier-filter" aria-labelledby="supplier-label" className="h-10 w-full"><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <a href="/api/export" download="izvoz.xml" className={buttonVariants({ className: "h-10 gap-2 px-4" })}>
          <Download aria-hidden="true" />Preuzmi XML
        </a>
      </div>
      <div className="my-5 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Prikazano <span className="font-medium text-foreground">{visible.length}</span> od {products.length} proizvoda</p>
        {hasFilters && <Button variant="ghost" onClick={() => { setSearch(""); setSupplier("all") }}>Poništi filtere</Button>}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[1080px]">
          <TableCaption className="sr-only">Objedinjeni katalog proizvoda. Sve cene su u RSD; prodajna cena uključuje PDV, zarada je bez PDV-a.</TableCaption>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {["Slika", "Naziv", "EAN", "Dobavljač", "Nabavna cena", "Prodajna cena", "Zarada", "Lager"].map((label, index) => <TableHead key={label} scope="col" className={`px-4 py-3 ${index >= 4 ? "text-right" : ""}`}>{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((product) => (
              <TableRow key={product.ean}>
                <TableCell className="px-4 py-3"><ProductThumbnail src={product.images[0]} name={product.name} /></TableCell>
                <TableCell className="min-w-60 max-w-80 px-4 py-3 font-medium whitespace-normal">{product.name}</TableCell>
                <TableCell className="px-4 font-mono text-xs tabular-nums">{product.ean}</TableCell>
                <TableCell className="px-4 text-muted-foreground">{product.supplier.name}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatRsd(product.purchasePrice)}</TableCell>
                <TableCell className="px-4 text-right font-medium tabular-nums">{formatRsd(product.sellingPrice)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatRsd(product.profit)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums"><span className={product.stockQuantity === 0 ? "rounded bg-muted px-2 py-1 text-muted-foreground" : ""}>{product.stockQuantity}</span></TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && <TableRow><TableCell colSpan={8} className="h-40 text-center whitespace-normal"><p>Nema proizvoda koji odgovaraju zadatim kriterijumima.</p>{hasFilters && <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setSupplier("all") }}>Obriši sve filtere</Button>}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Cene su u RSD. Prodajna cena uključuje PDV; nabavna cena i zarada su bez PDV-a. XML preuzimanje sadrži ceo katalog.</p>
    </section>
  )
}
