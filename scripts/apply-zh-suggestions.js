#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const suggestionsPath = path.join(genDir, 'zh-suggestions.json');
const zhPath = path.join(__dirname, '..', 'frontend', 'src', 'locales', 'zh.json');
if (!fs.existsSync(suggestionsPath)) { console.error('suggestions missing:', suggestionsPath); process.exit(1); }
if (!fs.existsSync(zhPath)) { console.error('zh.json missing:', zhPath); process.exit(1); }
const suggestions = JSON.parse(fs.readFileSync(suggestionsPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

function setKey(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]] = cur[parts[i]] || {};
  }
  cur[parts[parts.length - 1]] = value;
}

let applied = 0;
for (const s of suggestions) {
  if (s.cn && s.cn.trim().length > 0) {
    setKey(zh, s.key, s.cn);
    applied += 1;
  }
}

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Applied', applied, 'suggested translations to', zhPath);
