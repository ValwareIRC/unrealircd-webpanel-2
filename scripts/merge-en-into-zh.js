#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJSON(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function flatten(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flatten(val, newKey));
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

function unflatten(flat) {
  const result = {};
  for (const key of Object.keys(flat)) {
    const parts = key.split('.');
    let cur = result;
    parts.forEach((p, idx) => {
      if (idx === parts.length - 1) cur[p] = flat[key];
      else { if (!cur[p]) cur[p] = {}; cur = cur[p]; }
    });
  }
  return result;
}

function main() {
  const en = readJSON(path.join(localesDir, 'en-US.json'));
  const zhPath = path.join(localesDir, 'zh.json');
  if (!fs.existsSync(zhPath)) { console.error('zh.json missing'); process.exit(1); }
  const zh = readJSON(zhPath);
  const enF = flatten(en);
  const zhF = flatten(zh);

  let added = 0;
  for (const key of Object.keys(enF)) {
    if (!(key in zhF)) {
      zhF[key] = `__MISSING_ZH__ (${enF[key]})`;
      added++;
    }
  }

  if (added > 0) {
    const updated = unflatten(zhF);
    writeJSON(zhPath, updated);
    console.log(`Added ${added} keys to zh.json (placeholders)`);
  } else {
    console.log('No keys to add to zh.json');
  }
}

main();
