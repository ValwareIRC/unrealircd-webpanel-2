#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');

function readJSON(file) {
  const content = fs.readFileSync(file, 'utf8');
  return JSON.parse(content);
}

function writeJSON(file, obj) {
  const data = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(file, data, 'utf8');
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

function unflatten(flat) {
  const result = {};
  for (const flatKey of Object.keys(flat)) {
    const parts = flatKey.split('.');
    let cur = result;
    parts.forEach((p, idx) => {
      if (idx === parts.length - 1) {
        cur[p] = flat[flatKey];
      } else {
        if (!cur[p]) cur[p] = {};
        cur = cur[p];
      }
    });
  }
  return result;
}

function ensureAllKeys(baseFlat, fallbackFlat, targetFlat, localeName) {
  const missingKeys = [];
  const updated = Object.assign({}, targetFlat);
  for (const key of Object.keys(baseFlat)) {
    if (!(key in updated)) {
      if (key in fallbackFlat) {
        updated[key] = fallbackFlat[key];
        missingKeys.push({ key, source: 'en-US' });
      } else {
        // Do NOT fallback to zh.json anymore; report as missing so translators can add the key.
        // We'll set a placeholder to make missing keys obvious in UI.
        updated[key] = `__MISSING_EN__ (${baseFlat[key]})`;
        missingKeys.push({ key, source: 'MISSING_EN' });
      }
    }
  }
  return { updated, missingKeys };
}

function main() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

  const zhPath = path.join(localesDir, 'zh.json');
  if (!fs.existsSync(zhPath)) {
    console.error('zh.json not found in', localesDir);
    process.exit(1);
  }
  const zh = readJSON(zhPath);
  const baseFlat = flatten(zh);

  const enUSPath = path.join(localesDir, 'en-US.json');
  let enUS = {};
  if (fs.existsSync(enUSPath)) {
    enUS = readJSON(enUSPath);
  }
  const enUSFlat = flatten(enUS);

  const summary = {};
  const details = {};

  for (const file of files) {
    const filePath = path.join(localesDir, file);
    if (file === 'zh.json') continue; // zh is base

    const localeData = readJSON(filePath);
    const localeFlat = flatten(localeData);
    const { updated, missingKeys } = ensureAllKeys(baseFlat, enUSFlat, localeFlat, file);

    if (missingKeys.length > 0) {
      const newObj = unflatten(updated);
      writeJSON(filePath, newObj);
      summary[file] = missingKeys.length;
      details[file] = missingKeys;
    } else {
      summary[file] = 0;
    }
  }

  console.log('Locale merge complete. Summary (file: addedKeys):');
  console.log(summary);
  const reportPath = path.join(__dirname, 'locales-merge-report.json');
  writeJSON(reportPath, { summary, details });
  console.log('Detailed report written to', reportPath);
}

main();
