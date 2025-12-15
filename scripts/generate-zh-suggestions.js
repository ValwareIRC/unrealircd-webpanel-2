#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const zhPath = path.join(__dirname, '..', 'frontend', 'src', 'locales', 'zh.json');
const outDir = path.join(__dirname, 'generated-translations');
if (!fs.existsSync(zhPath)) { console.error('zh.json not found:', zhPath); process.exit(1); }
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const suggestions = [];

function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function walk(obj, prefix='') {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      if (!isChinese(v) && v.trim().length > 0) {
        suggestions.push({ key, en: v });
      }
    } else if (typeof v === 'object' && v !== null) {
      walk(v, key);
    }
  }
}

walk(zh);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const outPath = path.join(outDir, 'zh-suggestions.json');
fs.writeFileSync(outPath, JSON.stringify(suggestions, null, 2) + '\n', 'utf8');
console.log('Wrote', suggestions.length, 'zh suggestions to', outPath);
