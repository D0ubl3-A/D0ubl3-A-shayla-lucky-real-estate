# Shayla Lucky — Conversion-Focused Real Estate Website

Complete Node.js website with a functioning lead database and password-protected lead dashboard.

## Included

- Luxury black / cream / gold responsive design
- Shayla Lucky brand identity
- User-supplied portrait used as the image source; no generated replacement face
- Buyer, seller and investor conversion paths
- Private strategy lead form
- Working Express API
- SQLite lead storage
- UTM campaign tracking
- Honeypot spam trap
- Server-side validation
- Rate limiting
- Helmet security headers
- Password-protected lead dashboard
- Lead pipeline: new → contacted → qualified → won / lost
- CSV export
- SEO landing pages
- Dynamic sitemap.xml and robots.txt
- RealEstateAgent structured data
- Privacy page
- No public phone number
- No public email address
- No QR code
- No fake reviews, fake sales totals or invented awards

## Run locally

Requires Node.js 20+.

```bash
npm install
ADMIN_USER=admin ADMIN_PASSWORD='use-a-long-random-password' SITE_URL='https://your-domain.com' npm start
```

Website: `http://localhost:3000`

Lead dashboard: `http://localhost:3000/admin`

## Production deployment

This version uses SQLite and therefore requires persistent storage. Suitable deployment patterns include a VPS with Node + systemd/Nginx, or a Node host with a persistent disk/volume.

Set at minimum:

```text
NODE_ENV=production
SITE_URL=https://your-real-domain.com
ADMIN_USER=admin
ADMIN_PASSWORD=<long-random-password>
TRUST_PROXY=1
```

Use HTTPS and back up `data/leads.sqlite`.

## Name / brokerage launch note

The requested current public name is **Shayla Lucky**. Public real-estate sources still contain established records under the former professional name **Shayla Goriel**, including a current Berkshire Hathaway HomeServices Kee Realty directory record and Detroit property activity.

Before launch, have the brokerage approve the final licensed-name presentation, advertising language and required disclosures. The site references the brokerage in text and does not bundle a copied brokerage logo.

## Domain

The HTML currently uses `https://shaylalucky.com` as the intended canonical domain. Change the canonical URLs if a different domain is chosen.

## Contact privacy

The site does not display Shayla's phone number or email address. Visitors can submit their own contact information privately through the lead form.
