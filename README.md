# Catalog App

[Srpski](README.sr.md)

A full-stack application that combines product offers from three suppliers into a single catalog. For each EAN, it selects the valid offer with the lowest selling price.

## Links

- [GitHub Repository](https://github.com/marko2405/catalog-app)
- [Live Application](https://marko-catalog.vercel.app)

## Features

- Server-side XML processing, price and profit calculation, and duplicate removal.
- Product table with search by name or EAN and supplier filtering that work together.
- Pagination and Serbian/English language switching.
- Download of the complete `izvoz.xml` catalog, regardless of active filters.
- Configurable supplier margins and VAT.

## Technologies

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, next-intl, fast-xml-parser and decimal.js.

## Local setup

Requirements: Node.js 24, pnpm 11.15.1 and Git.

```bash
git clone https://github.com/marko2405/catalog-app.git
cd catalog-app
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

No database, API keys or separate backend are required. The source XML files are included in the repository.

## Pricing and configuration

Default margins: Alfa 5%, Beta 7%, Gama 0%. VAT: 20%.

Selling price = purchase price × (1 + margin) × (1 + VAT). Profit excludes VAT. Final amounts are rounded to two decimal places.

To change the rates, copy `.env.example` to `.env.local`, edit the values and restart the application.

Offers with missing EAN, negative stock or non-positive purchase prices are excluded. Zero stock is accepted. Equal selling prices are resolved deterministically by supplier ID, then source order.

To regenerate `izvoz.xml` locally:

```bash
pnpm generate:xml
```

## Verification

```bash
pnpm verify:suppliers
pnpm verify:catalog
pnpm verify:frontend
pnpm lint
pnpm build
```
