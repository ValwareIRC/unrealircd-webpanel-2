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
  const zhPath = path.join(localesDir, 'zh.json');
  if (!fs.existsSync(zhPath)) {
    console.error('zh.json not found');
    process.exit(1);
  }
  const zh = readJSON(zhPath);
  const zhF = flatten(zh);

  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  const report = {};
  let allComplete = true;
  for (const file of files) {
    const filePath = path.join(localesDir, file);
    const data = readJSON(filePath);
    const flat = flatten(data);
    const missing = [];
    for (const key of Object.keys(zhF)) {
      if (!(key in flat)) missing.push(key);
    }
    report[file] = { missingCount: missing.length, missing: missing };
    if (missing.length > 0) allComplete = false;
  }

  console.log('Verification report (file: missingCount)');
  for (const f of Object.keys(report)) {
    console.log(`  ${f}: ${report[f].missingCount}`);
  }
  if (allComplete) {
    console.log('\nAll locale files contain the full set of keys from zh.json.');
  } else {
    console.log('\nSome locales are missing keys. See script output for details.');
  }
  const out = path.join(__dirname, 'verify-locales-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Detailed report written to', out);
}

main();
