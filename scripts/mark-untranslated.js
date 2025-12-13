#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, 'translation-csvs');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
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

function markUntranslated(en, zh, target) {
  const enF = flatten(en);
  const zhF = flatten(zh);
  const tF = flatten(target);
  const updated = Object.assign({}, tF);
  const changes = [];
  for (const key of Object.keys(enF)) {
    if (!(key in tF)) continue;
    const locVal = tF[key];
    const enVal = enF[key];
    // If locale matches en-US text, mark as untranslated
    if (locVal === enVal) {
      const placeholder = `__UNTRANSLATED__ (${enVal})`;
      updated[key] = placeholder;
      changes.push({ key, enVal });
    }
  }
  return { updated: unflatten(updated), changes };
}

function main() {
  const enPath = path.join(localesDir, 'en-US.json');
  const zhPath = path.join(localesDir, 'zh.json');
  if (!fs.existsSync(enPath) || !fs.existsSync(zhPath)) {
    console.error('en-US.json or zh.json missing');
    process.exit(1);
  }
  const en = readJSON(enPath);
  const zh = readJSON(zhPath);
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

  const summary = {};
  for (const file of files) {
    if (file === 'en-US.json' || file === 'en-GB.json' || file === 'zh.json') continue; // don't touch en locales or zh
    const filePath = path.join(localesDir, file);
    const target = readJSON(filePath);
    const { updated, changes } = markUntranslated(en, zh, target);
    if (changes.length) {
      writeJSON(filePath, updated);
    }
    summary[file] = changes.length;
  }
  console.log('Marked untranslated keys in locales (file: count)');
  console.log(summary);
  const reportPath = path.join(__dirname, 'mark-untranslated-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log('Wrote report to', reportPath);
}

main();
