#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ld = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(ld, 'en-US.json'), 'utf8'));
const pt = JSON.parse(fs.readFileSync(path.join(ld, 'pt.json'), 'utf8'));
function flatten(o, p = '') {
  const r = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    const nk = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(r, flatten(v, nk));
    else r[nk] = v;
  }
  return r;
}
const fe = flatten(en), fp = flatten(pt);
const out = Object.keys(fp).filter(k => typeof fp[k] === 'string' && fp[k].startsWith('__UNTRANSLATED__')).map(k => ({ key: k, en: fe[k] || null, current: fp[k] }));
if (!fs.existsSync(path.join(__dirname, 'generated-translations'))) fs.mkdirSync(path.join(__dirname, 'generated-translations'));
fs.writeFileSync(path.join(__dirname, 'generated-translations', 'pt-candidates.json'), JSON.stringify(out, null, 2));
console.log('Wrote', out.length, 'pt candidates to scripts/generated-translations/pt-candidates.json');
