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
