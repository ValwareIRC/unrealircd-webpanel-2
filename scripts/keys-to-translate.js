#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');

function readJSON(file) {
  const content = fs.readFileSync(file, 'utf8');
  return JSON.parse(content);
}

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
  const en = readJSON(path.join(localesDir, 'en-US.json'));
  const zh = readJSON(path.join(localesDir, 'zh.json'));
  const enF = flatten(en);
  const zhF = flatten(zh);

  const output = {};
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    if (file === 'zh.json' || file === 'en-US.json') continue;
    const loc = readJSON(path.join(localesDir, file));
    const locF = flatten(loc);
    const keys = [];
    for (const k of Object.keys(zhF)) {
      // consider keys where value equals en-US value (likely fallback)
      const v = locF[k];
      if (v === undefined) continue;
      if (enF[k] !== undefined && v === enF[k]) {
        // if the key equals zh too then it's probably English that's identical to Chinese - skip
        if (v === zhF[k]) continue;
        keys.push(k);
      }
    }
    output[file] = keys;
  }
  const outFile = path.join(__dirname, 'keys-to-translate.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote keys-to-translate to', outFile);
}

main();
