This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Phase 1: supplier ingestion

`src/server/services/supplier.service.ts` exports `loadSupplierOffers(id)` and
`loadAllSupplierOffers()`. Run from the application root, or pass its path as
the optional argument. Files are read from `data/` with strict UTF-8 decoding.
No files are written. Server modules use `server-only` to prevent client imports.

Each result contains `supplier`, `sourceCount`, `offers`, and `issues`. **Check
`issues` before using the offers**: invalid entries are reported with a one-based
source position and SKU, while all valid offers remain available. Missing files,
malformed XML, and invalid document structure throw descriptive errors. Product
validation reports the first failure for each invalid entry. No deduplication or
pricing calculations are performed.

The offer model contains a string EAN, name, category, brand, supplier ID and
official name, integer stock quantity, exact decimal purchase price string (RSD
excluding VAT), and image URL array. EANs are trimmed, never converted to numbers,
and checked for digits without imposing an EAN length or checksum not specified
by the assignment. Prices retain their supplied precision and trailing zeros.
Missing or empty EANs, zero or negative purchase prices, and negative/fractional
stock reject the individual supplier offer and record a validation issue. Zero
stock is accepted. Other valid offers with the same EAN remain available.
Rejecting zero-price offers is a business assumption introduced to prevent invalid
purchase prices from incorrectly winning the future cheapest-offer selection.
Invalid source values are not fabricated or automatically corrected.
Names, categories and brands remain supplier-specific, including their spelling
and capitalization. These fields are required. Missing/empty `fotografija` means
`images: []`; a supplied empty or invalid `slika` is an error.

All three supplied XML files use `proizvodi/proizvod`, with `dobavljac`, `datum`
and `valuta` root attributes. Shared fields are `ean`, `naziv`, `kategorija`,
`brend`, `cena`, `lager`, and `fotografija/slika`. Alfa and Beta use decimal dots;
Gama uses decimal commas. The shared parser uses centralized supplier definitions
to select the separator. `sku` is used for diagnostics; `tezina` and the empty
`opis` fields are outside the normalized offer model. All files declare UTF-8.

Observed source results:

| Supplier | Source entries | Valid offers | Invalid entries |
| --- | ---: | ---: | ---: |
| Alfa Distribucija d.o.o. | 41 | 41 | 0 |
| Beta Trade d.o.o. | 39 | 36 | 3 |
| Gama Import d.o.o. | 42 | 41 | 1 |
| Total | 122 | 118 | 4 |

There are 52 distinct valid EANs; duplicate offers are retained. Beta `BT10077`
and Gama `GM10077` lack EANs. Beta `BT10231` has stock `-3`. Beta `BT10126` has
price `0.00` and is also rejected. The valid offers contain 41 distinct EANs for
Alfa, 36 for Beta, and 41 for Gama. The charger rejected from Beta remains available
from Alfa (`AD10014`) and Gama (`GM10168`); the negative-stock powerbank remains
available from Gama (`GM10007`). The two missing-EAN products have no identified
equivalents in the other feeds and are absent from the valid offers.
Gama `GM10259` has surrounding
EAN whitespace, which is trimmed. All entries have one to three images; no
source EAN starts with zero. There are 26 valid offers with zero stock.

### Configuration and verification

Copy `.env.example` to `.env.local` for Next.js overrides. `getPricingConfig()`
reads server environment variables when called; defaults are `ALFA_MARGIN=0.05`,
`BETA_MARGIN=0.07`, `GAMA_MARGIN=0`, and `VAT_RATE=0.20`. Values are exact decimal
strings representing fractional rates. Unset variables use defaults; empty,
negative, non-finite, percent, comma and exponential representations are rejected.
Zero is supported and no upper bound is imposed. No `NEXT_PUBLIC_` values are used.

Run with Node.js 22.18+ (verified with 24.14):

```bash
pnpm verify:suppliers
pnpm lint
pnpm exec tsc --noEmit
```

The verification command prints representative products and issues from every
supplier. It checks every valid source row and uses only in-memory mutations of
actual XML for edge cases (leading zeros, Unicode/entities, precision, optional
images, malformed XML and invalid fields). The source files are never changed.
The tests intentionally expect the four known source issues and verify that valid
offers sharing an EAN with rejected offers survive. Zero stock, zero supplier
margins, and missing images remain accepted. Both price separators are tested for
zero/negative rejection and exact preservation of very small positive prices.

Standalone TypeScript scripts can reuse the same server modules by running
`node --conditions=react-server path/to/script.ts`. To load an environment file
outside Next.js, add `--env-file=.env.local` before the script path. Explicit
`.ts` imports and `allowImportingTsExtensions` support native Node execution
without another runner dependency. Node may emit a harmless module-type detection
warning because the existing package does not declare an ES module type.

## Phase 2: pricing, catalog and XML export

`loadCatalog()` in `src/server/services/catalog.service.ts` is the shared server
pipeline for the generator and download endpoint. It returns serializable
`products`, their corresponding `xml`, validation `issues`, and source/valid/
rejected/duplicate/product counts. Only validated offers enter aggregation.
The original supplier files remain unchanged.

Pricing uses the configured fractional margin and VAT rate:

- Net selling price = purchase price × (1 + supplier margin).
- Selling price including VAT = net selling price × (1 + VAT rate).
- Profit excluding VAT = net selling price − purchase price.

VAT is assumed to be collected tax, not profit. `calculateProfit()` isolates this
accounting assumption. All monetary calculations use decimal.js with a local
precision sufficient for the input decimal lengths. There is no intermediate
rounding. Final purchase, net selling, selling and profit values use two decimal
places and `ROUND_HALF_UP`. The normalized source purchase price remains exact;
the final product and XML serialize purchase price to two decimals as well.
Profit is calculated from the unrounded net price, not the rounded display value.

Offers are grouped by their string EAN and compared by final, two-decimal selling
price using decimal.js. Equal prices prefer the lexicographically smaller supplier
ID (`alfa`, then `beta`, then `gama`); equal prices from the same supplier retain
the first source entry. Stock availability does not affect selection: zero-stock
offers remain eligible. Every selected field and image comes from that offer;
stock and images are never combined across suppliers. Products are sorted by EAN
for deterministic output. The final model adds `sellingPrice` and `profit` as
decimal strings, with no Decimal instances exposed to frontend consumers.

Generate the physical repository-root export:

```bash
pnpm generate:xml
```

The command loads Next.js environment files through `@next/env`. By default it
uses production precedence: existing process variables, `.env.production.local`,
`.env.local`, `.env.production`, `.env`. Set `NODE_ENV=development` to use the
development variants, matching `next dev`. `.env.local` works in both modes;
Next.js's test-mode rules apply when `NODE_ENV=test`. Generation prints counts
and rejection reasons and exits unsuccessfully on failures. `izvoz.xml` is not
ignored by Git; regenerate it when source data or pricing changes.

`GET /api/export` generates fresh XML in memory using the same pipeline. It returns
`application/xml; charset=utf-8`, attachment filename `izvoz.xml`, and `no-store`.
It uses the Node.js runtime and never reads the saved export or writes a runtime
file. Unexpected failures return HTTP 500 with a generic JSON error; detailed
errors are logged only on the server. The route's `outputFileTracingIncludes`
explicitly includes `data/*.xml`; all three source files were verified in the
production route trace. No deployment has been performed.

XML uses UTF-8 and `proizvodi/proizvod`, with fields `ean`, `naziv`, `kategorija`,
`brend`, `dobavljac` (official supplier name), `lager`, `nabavna_cena`,
`prodajna_cena`, `zarada`, and `slike/slika`. Missing images produce `<slike/>`.
XML serialization escapes special characters and preserves Unicode and EAN zeros.
Rejected entries and validation metadata are excluded from the XML.

### Phase 2 verification results

With default configuration: 122 source offers, 118 valid, 4 rejected, 66 duplicate
offers removed, and 52 unique products. Selected suppliers: Alfa 14, Beta 9,
Gama 29. Nine selected products have zero stock. All four Phase 1 rejections remain
explicitly recorded. Valid offers with the same EAN as rejected entries survive.

Representative actual-source calculations (RSD):

| Supplier / EAN | Purchase | Net selling | Selling incl. VAT | Profit excl. VAT |
| --- | ---: | ---: | ---: | ---: |
| Alfa / 8601005617419 | 2608.41 | 2738.83 | 3286.60 | 130.42 |
| Beta / 8601001644129 | 9047.80 | 9681.15 | 11617.38 | 633.35 |
| Gama / 8601000822061 | 1035.50 | 1035.50 | 1242.60 | 0.00 |

```bash
pnpm generate:xml
pnpm verify:suppliers
pnpm verify:catalog
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

The supplier suite (4 tests), catalog suite (6 tests), ESLint, TypeScript, and
production build passed. Catalog checks cover reference formulas, overrides,
rounding, minimum-price selection, deterministic ties, zero-stock selection,
selected-field consistency, XML round trips, Unicode/entities, leading zeros,
missing images, physical-file equality, and route success/error responses.
Reference and edge-case tests use explicit configuration; file/API comparisons
use the active environment. Generate the file before running catalog verification.

The production endpoint was also verified over HTTP on port 3100: status 200,
correct headers, and complete XML identical to the shared catalog and generated
file. To repeat this check, start `pnpm start --port 3100` after building and set
`EXPORT_TEST_URL=http://localhost:3100/api/export` when running `pnpm verify:catalog`.
The server and verification process must use the same pricing environment.
The build requires access to Google Fonts for the existing frontend font setup.

## Phase 3: product catalog interface

The dynamic homepage loads `loadCatalog()` in a Server Component and passes only
serializable products and supplier identities to `CatalogTable`. Prices,
validation, aggregation and XML remain exclusively server-side. Both the homepage
and export route include the source XML files in their production file traces.

The Serbian Latin interface shows the eight required columns in order: Slika,
Naziv, EAN, Dobavljač, Nabavna cena, Prodajna cena, Zarada, Lager. Decimal strings
are formatted as `1.000,00 RSD` without numeric conversion or additional rounding.
Zero-stock rows remain visible. Search matches partial names (case-insensitive)
or EAN strings, trims surrounding whitespace, and combines with the winning
supplier filter. Changing one control preserves the other; counts cover the full
filtered catalog. No sorting or pagination is introduced.

`Preuzmi XML` downloads the complete catalog from `/api/export`, independently of
active filters. The first selected-offer image is shown in a fixed 48px thumbnail;
the complete image collection remains in the data and export. Actual source URLs
use `https://picsum.photos/seed/.../600/600`. Unoptimized Next.js images request
these supplier-provided URLs directly, including their redirects. No replacement
product imagery is invented. Missing or failed images use the same icon placeholder.
External image availability is outside the application's control.

Controls stack on narrow screens; the table scrolls horizontally without hiding
columns. Labels, semantic table headings, focus styles, keyboard selection, live
counts, an empty-result reset, and a generic loading-failure message with retry
are provided. No artificial loading delays or extra JSON endpoint are used.

Verification: `pnpm verify:frontend` passes two tests using the actual catalog and
exact decimal formatting. The existing supplier (4) and catalog (6) tests,
ESLint, TypeScript checking and production build also passed. Headless Chromium
tested all 52 rows against server data, supplier counts 14/9/29, nine zero-stock
rows, full/partial real names and EANs, case/whitespace handling, combined filters,
state preservation, counts, empty/reset behavior, keyboard selection, and a real
XML download containing all 52 products while filtered. Desktop and 390px mobile
screenshots were inspected; the page had no horizontal overflow outside the
scrolling table and no browser JavaScript errors. Image failures were deliberately
simulated in the browser; missing-image rendering was checked separately at the
component level because every current catalog product has images. A server with
invalid pricing configuration verified the generic failure message without
exposing the internal error. The browser tool was temporary and adds no project
dependency. Internationalization and deployment remain unimplemented.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
