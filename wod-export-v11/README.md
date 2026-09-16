# Shayla Goriel — Web on Demand Version 11 Export

This folder preserves the complete Web on Demand Version 11 site source from website ID `7794`.

Source deployment: https://chatgpt-3s7pkwb4.webondemand.com/

## Contents

- `site-core.mjs` — shared `<head>` content and site-wide CSS.
- `pages-main.mjs` — Home, Buyers, Sellers/Investors, About, Contact, and Metro Detroit hub.
- `pages-local.mjs` — Detroit, Birmingham, Southfield, Bloomfield Hills, Guides, Novi, Northville, Dearborn, and Farmington pages.
- `site-source.mjs` — combines the complete page set into one exported site object.
- `build-static.mjs` — generates browser-ready static HTML files into `dist/`.

## Important form note

The original forms post to `/SendSystemMail_IC.aspx`, which is a Web on Demand endpoint. The export preserves those forms exactly. If the site is deployed independently of Web on Demand, replace that endpoint with a server-side form handler or compatible API before relying on form submissions.

## Build

```bash
node wod-export-v11/build-static.mjs
```

This creates a static mirror under `wod-export-v11/dist/`.

## Snapshot

- Web on Demand version: **11**
- Export branch: **wod-v11-export**
- Positioning at this snapshot: Metro Detroit real estate; luxury-niche rewrite had not yet been applied.
- Existing repo application outside this folder was intentionally left untouched.
