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
  const zh = readJSON(path.join(localesDir, 'zh.json'));
  const en = readJSON(path.join(localesDir, 'en-US.json'));
  const zhFlat = flatten(zh);
  const enFlat = flatten(en);

  const report = {};
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    if (file === 'zh.json') continue;
    const locale = readJSON(path.join(localesDir, file));
    const locFlat = flatten(locale);
    let fromEn = 0, fromZh = 0, others = 0, total = 0;
    for (const key of Object.keys(zhFlat)) {
      const val = locFlat[key];
      if (val === undefined) continue; // shouldn't happen now
      total++;
      if (enFlat[key] !== undefined && val === enFlat[key]) fromEn++;
      else if (val === zhFlat[key]) fromZh++;
      else others++;
    }
    report[file] = { total, fromEn, fromZh, others };
  }
  const out = path.join(__dirname, 'fallback-source-summary.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Wrote summary to', out);
}

main();
