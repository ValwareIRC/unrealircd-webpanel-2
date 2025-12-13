#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const outDir = path.join(__dirname, 'translation-csvs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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

  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    if (file === 'en-US.json' || file === 'zh.json') continue;
    const loc = readJSON(path.join(localesDir, file));
    const locF = flatten(loc);
    const rows = [];
    for (const key of Object.keys(enF)) {
      const enVal = enF[key];
      const locVal = locF[key];
      // want to include keys that are currently equal to en-US — these are untranslated
      if (locVal === undefined) continue; // should not happen after sync
      if (locVal === enVal) {
        rows.push({ key, enVal, zhVal: zhF[key] || '', locVal });
      }
    }
    const csv = rows.map(r => `${r.key}\t"${r.enVal.replace(/"/g, '""')}"\t"${r.zhVal.replace(/"/g, '""')}"\t"${r.locVal.replace(/"/g, '""')}"`).join(os.EOL);
    const header = 'key\ten_US_text\tzh_text\tcurrent_local_text';
    const outFile = path.join(outDir, file.replace('.json', '.tsv'));
    fs.writeFileSync(outFile, header + os.EOL + csv + os.EOL, 'utf8');
    console.log('Wrote', outFile, '(', rows.length, 'rows )');
  }
}

main();
