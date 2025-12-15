#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const plPath = path.join(genDir, 'pl.json');
if (!fs.existsSync(plPath)) { console.error('pl.json missing:', plPath); process.exit(1); }
const pl = JSON.parse(fs.readFileSync(plPath, 'utf8'));

const extras = {
  'statistics.gLines': 'G-Lines',
  'statistics.kLines': 'K-Lines',
  'statistics.zLines': 'Z-Lines',
  'statistics.gzLines': 'GZ-Lines',
  'statistics.shuns': 'Shuns',
  'statistics.qLines': 'Q-Lines',
  'banExceptions.maskPlaceholder': '*@*.trusted.example.com',
  'banExceptions.gline': 'G-Line (Globalna)',
  'banExceptions.kline': 'K-Line (Lokalna)',
  'banExceptions.gzline': 'GZ-Line (Globalne IP)',
  'banExceptions.zline': 'Z-Line (Lokalne IP)',
  'banExceptions.shun': 'Shun',
  'sidebar.logout': 'Wyloguj się'
};

for (const k of Object.keys(extras)) pl[k] = extras[k];
fs.writeFileSync(plPath, JSON.stringify(pl, null, 2) + '\n', 'utf8');
console.log('Patched pl.json with', Object.keys(extras).length, 'additional translations');
