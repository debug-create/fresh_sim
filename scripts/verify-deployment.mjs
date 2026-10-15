import {access, readFile, readdir} from 'node:fs/promises';
import {constants} from 'node:fs';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);

const fail = (message) => {
  throw new Error(`Deployment verification failed: ${message}`);
};

await access(new URL('index.html', dist), constants.R_OK).catch(() =>
  fail('dist/index.html is missing'),
);

const builtHtml = await readFile(new URL('index.html', dist), 'utf8');
if (!builtHtml.includes('<div id="root"></div>')) {
  fail('the production HTML does not contain the React mount point');
}

const assetNames = await readdir(new URL('assets/', dist)).catch(() => []);
if (!assetNames.some((name) => /\.js$/.test(name))) {
  fail('no production JavaScript bundle was emitted');
}
if (!assetNames.some((name) => /\.css$/.test(name))) {
  fail('no production stylesheet was emitted');
}

const vercel = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
const hasSpaRewrite = vercel.rewrites?.some(
  (rule) => rule.source === '/(.*)' && rule.destination === '/index.html',
);
if (!hasSpaRewrite) {
  fail('vercel.json is missing the SPA fallback rewrite');
}

const redirects = await readFile(new URL('public/_redirects', root), 'utf8');
if (!redirects.includes('/* /index.html 200')) {
  fail('public/_redirects is missing the portable SPA fallback');
}

console.log(`Deployment artifact verified (${assetNames.length} bundled assets, SPA fallback enabled).`);
