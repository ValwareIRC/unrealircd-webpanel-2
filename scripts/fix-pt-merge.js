#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const generatedDir = path.join(__dirname, 'generated-translations');

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function flatten(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) Object.assign(result, flatten(val, newKey));
    else result[newKey] = val;
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
  const genPath = path.join(generatedDir, 'pt.json');
  if (!fs.existsSync(genPath)) { console.error('No generated pt.json found'); process.exit(1); }
  const gen = readJSON(genPath);
  const localePath = path.join(localesDir, 'pt.json');
  if (!fs.existsSync(localePath)) { console.error('Locale pt.json missing'); process.exit(1); }
  const locale = readJSON(localePath);
  const flatLocale = flatten(locale);
  const flatGen = flatten(gen);
  for (const k of Object.keys(flatGen)) flatLocale[k] = flatGen[k];
  const merged = unflatten(flatLocale);
  fs.writeFileSync(localePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log('Merged generated pt.json into frontend/src/locales/pt.json');
}

main();
