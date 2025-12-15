#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

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

function main() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  const keysSet = new Set();
  for (const file of files) {
    if (file === 'en-US.json') continue;
    const loc = readJSON(path.join(localesDir, file));
    const flat = flatten(loc);
    for (const [k, v] of Object.entries(flat)) {
      if (typeof v === 'string' && (v.startsWith('__UNTRANSLATED__') || v.startsWith('__MISSING_EN__') || v.startsWith('__UNTRANSLATED__ ('))) {
        keysSet.add(k);
      }
    }
  }
  const out = path.join(__dirname, 'placeholder-keys.json');
  fs.writeFileSync(out, JSON.stringify(Array.from(keysSet).sort(), null, 2));
  console.log('Wrote placeholder keys to', out);
}

main();
