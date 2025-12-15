#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const jaPath = path.join(genDir, 'ja.json');
if (!fs.existsSync(jaPath)) { console.error('ja.json missing:', jaPath); process.exit(1); }
const ja = JSON.parse(fs.readFileSync(jaPath, 'utf8'));

const extras = {
  'statistics.gLines': 'G-Lines',
  'statistics.kLines': 'K-Lines',
  'statistics.zLines': 'Z-Lines',
  'statistics.gzLines': 'GZ-Lines',
  'statistics.shuns': 'Shuns',
  'statistics.qLines': 'Q-Lines',
  'banExceptions.maskPlaceholder': '*@*.trusted.example.com',
  'banExceptions.gline': 'G-Line（グローバル）',
  'banExceptions.kline': 'K-Line（ローカル）',
  'banExceptions.gzline': 'GZ-Line（グローバルIP）',
  'banExceptions.zline': 'Z-Line（ローカルIP）',
  'banExceptions.shun': 'Shun',
  'sidebar.logout': 'サインアウト'
};

for (const k of Object.keys(extras)) ja[k] = extras[k];
fs.writeFileSync(jaPath, JSON.stringify(ja, null, 2) + '\n', 'utf8');
console.log('Patched ja.json with', Object.keys(extras).length, 'additional translations');
