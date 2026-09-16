import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from './site-source.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const documentFor = (page) => `<!doctype html><html lang="en"><head>${site.head}<style>${site.css}</style><title>${page.name} | Shayla Goriel</title></head><body>${page.body}</body></html>`;

for (const page of site.pages) {
  const dir = page.slug ? path.join(out, page.slug) : out;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), documentFor(page), 'utf8');
}

fs.writeFileSync(path.join(out, 'site-manifest.json'), JSON.stringify({
  websiteId: site.websiteId,
  version: site.version,
  sourceUrl: site.sourceUrl,
  pages: site.pages.map(({ name, slug }) => ({ name, slug }))
}, null, 2));

console.log(`Built ${site.pages.length} pages into ${out}`);
