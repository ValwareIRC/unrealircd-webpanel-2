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
  const enFlat = flatten(en);

  const report = {};
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    if (file === 'en-US.json') continue;
    const locale = readJSON(path.join(localesDir, file));
    const locFlat = flatten(locale);
    const missing = [];
    for (const key of Object.keys(enFlat)) {
      if (locFlat[key] === undefined) missing.push(key);
    }
    report[file] = { missingCount: missing.length, missingKeys: missing };
  }
  const out = path.join(__dirname, 'missing-keys-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Wrote missing keys report to', out);
}

main();
