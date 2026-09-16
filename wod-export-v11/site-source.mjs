import { head, css } from './site-core.mjs';
import { mainPages } from './pages-main.mjs';
import { localPages } from './pages-local.mjs';

export const site = {
  websiteId: '7794',
  version: 11,
  sourceUrl: 'https://chatgpt-3s7pkwb4.webondemand.com/',
  siteFormat: 'multi-page',
  visualStyle: 'Preserve the current visual style',
  head,
  css,
  pages: [...mainPages, ...localPages]
};

export default site;
