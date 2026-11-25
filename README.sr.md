# Catalog App

[English](README.md)

Full-stack aplikacija koja objedinjuje ponude tri dobavljača u jedinstveni katalog proizvoda. Za svaki EAN bira se validna ponuda sa najnižom prodajnom cenom.

## Linkovi

- [GitHub repozitorijum](https://github.com/marko2405/catalog-app.git)
- [Online aplikacija]: (marko-catalog.vercel.app).

## Funkcionalnosti

- Serverska obrada XML fajlova, obračun cena i zarade i uklanjanje duplikata.
- Tabela proizvoda sa pretragom po nazivu ili EAN-u i istovremenim filtriranjem po dobavljaču.
- Paginacija i promena jezika između srpskog i engleskog.
- Preuzimanje kompletnog kataloga `izvoz.xml`, nezavisno od aktivnih filtera.
- Podesive marže dobavljača i stopa PDV-a.

## Tehnologije

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, next-intl, fast-xml-parser i decimal.js.

## Lokalno pokretanje

Preduslovi: Node.js 24, pnpm 11.15.1 i Git.

```bash
git clone https://github.com/YOUR_USERNAME/catalog-app.git
cd catalog-app
pnpm install --frozen-lockfile
pnpm dev
```

Otvoriti [http://localhost:3000](http://localhost:3000).

Nisu potrebni baza podataka, API ključevi niti zaseban backend. Originalni XML fajlovi nalaze se u repozitorijumu.

## Obračun cena i konfiguracija

Podrazumevane marže: Alfa 5%, Beta 7%, Gama 0%. PDV: 20%.

Prodajna cena = nabavna cena × (1 + marža) × (1 + PDV). Zarada se računa bez PDV-a. Konačni iznosi zaokružuju se na dve decimale.

Za promenu stopa kopirati `.env.example` u `.env.local`, izmeniti vrednosti i ponovo pokrenuti aplikaciju.

Ponude bez EAN-a, sa negativnim lagerom ili nabavnom cenom manjom ili jednakom nuli se odbacuju. Nulti lager je dozvoljen. Kod jednakih prodajnih cena izbor se vrši prema identifikatoru dobavljača, a zatim redosledu u izvornim podacima.

Za ponovno generisanje fajla `izvoz.xml`:

```bash
pnpm generate:xml
```

## Provera aplikacije

```bash
pnpm verify:suppliers
pnpm verify:catalog
pnpm verify:frontend
pnpm lint
pnpm build
```
