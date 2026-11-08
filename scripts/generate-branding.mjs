import assert from 'node:assert/strict';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../brand.json', import.meta.url)));
const web = config.webRoot;
const master = readFileSync(`${web}/branding/logo-master.svg`, 'utf8');
const geometry = master.slice(master.indexOf('<g '), master.lastIndexOf('</svg>'));
const svg = (body, viewBox='0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const badge = svg(`<rect width="64" height="64" rx="16" fill="#171717"/><g transform="translate(6.4 6.4) scale(.8)">${geometry}</g>`);
const png = (source, size) => new Resvg(source, {fitTo:{mode:'width',value:size}}).render().asPng();
mkdirSync(`${web}/branding`, {recursive:true});
writeFileSync(`${web}/logo.svg`, master);
writeFileSync(`${web}/branding/logo-light.svg`, master.replaceAll('#fafafa','#171717'));
writeFileSync(`${web}/branding/logo-master.png`, png(master,1024));
writeFileSync(`${web}/favicon.svg`,badge);
writeFileSync(`${web}/branding/logo-light.png`,png(master.replaceAll('#fafafa','#171717'),1024));
writeFileSync(`${web}/icon-maskable-512.png`,png(badge.replace('rx="16"','rx="0"'),512));
for (const size of [16,32,48,180,192,512]) writeFileSync(`${web}/branding/icon-${size}.png`,png(badge,size));
for (const [file,size] of [['favicon.png',32],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]) writeFileSync(`${web}/${file}`,png(badge,size));
const social=svg(`<rect width="1200" height="630" fill="#080808"/><g transform="translate(510 120) scale(2.8)">${geometry}</g><text x="600" y="415" text-anchor="middle" fill="#fafafa" font-family="Segoe UI,Arial,sans-serif" font-size="54" font-weight="600">${config.name}</text><text x="600" y="477" text-anchor="middle" fill="#a3a3a3" font-family="Segoe UI,Arial,sans-serif" font-size="24">Burma Project Ideas</text>`,'0 0 1200 630');
writeFileSync(`${web}/branding/social.svg`,social);
writeFileSync(`${web}/branding/social.png`,png(social,1200));

for (const [file,width,height] of [['favicon.png',32,32],['apple-touch-icon.png',180,180],['icon-192.png',192,192],['icon-512.png',512,512],['icon-maskable-512.png',512,512],['branding/logo-master.png',1024,1024],['branding/social.png',1200,630]]) {
 const bytes=readFileSync(`${web}/${file}`);
 assert.equal(bytes.readUInt32BE(16),width,file);
 assert.equal(bytes.readUInt32BE(20),height,file);
}
for(const icon of JSON.parse(readFileSync(`${web}/manifest.webmanifest`)).icons) assert.ok(readFileSync(`${web}/${icon.src}`).length, icon.src);
