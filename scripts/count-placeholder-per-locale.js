#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
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
const out = {};
for (const f of files) {
  const full = path.join(localesDir, f);
  const j = JSON.parse(fs.readFileSync(full, 'utf8'));
  const flat = flatten(j);
  const keys = Object.keys(flat).filter(k => typeof flat[k] === 'string' && (flat[k].includes('__UNTRANSLATED__') || flat[k].includes('__MISSING_ZH__') || flat[k].includes('__MISSING_EN__')));
  out[f] = { count: keys.length, keys };
}
const outFile = path.join(__dirname, 'placeholder-per-locale.json');
fs.writeFileSync(outFile, JSON.stringify(out, null, 2)+'\n', 'utf8');
console.log('Wrote', outFile);
