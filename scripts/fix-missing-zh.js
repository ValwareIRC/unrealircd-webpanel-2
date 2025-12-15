#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'frontend', 'src', 'locales', 'zh.json');
if (!fs.existsSync(file)) { console.error('zh.json not found:', file); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const regex = /__MISSING_ZH__ \(([^)]*)\)/g;
let count = 0;
s = s.replace(regex, (_, group) => {
  count += 1;
  return group;
});
fs.writeFileSync(file, s, 'utf8');
console.log('Replaced', count, 'missing zh placeholders in', file);
