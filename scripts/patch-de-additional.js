#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const dePath = path.join(genDir, 'de.json');
if (!fs.existsSync(dePath)) { console.error('de.json missing:', dePath); process.exit(1); }
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));

const extras = {
  'statistics.gLines': 'G-Lines',
  'statistics.kLines': 'K-Lines',
  'statistics.zLines': 'Z-Lines',
  'statistics.gzLines': 'GZ-Lines',
  'statistics.shuns': 'Shuns',
  'statistics.qLines': 'Q-Lines',
  'banExceptions.maskPlaceholder': '*@*.trusted.example.com',
  'banExceptions.gline': 'G-Line (Global)',
  'banExceptions.kline': 'K-Line (Lokal)',
  'banExceptions.gzline': 'GZ-Line (Globales IP)',
  'banExceptions.zline': 'Z-Line (Lokales IP)',
  'banExceptions.shun': 'Shun',
  'sidebar.logout': 'Abmelden'
};

for (const k of Object.keys(extras)) de[k] = extras[k];
fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
console.log('Patched de.json with', Object.keys(extras).length, 'additional translations');
