#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const frPath = path.join(genDir, 'fr.json');
if (!fs.existsSync(frPath)) { console.error('fr.json missing:', frPath); process.exit(1); }
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

const extras = {
  'statistics.gLines': 'G-Lines',
  'statistics.kLines': 'K-Lines',
  'statistics.zLines': 'Z-Lines',
  'statistics.gzLines': 'GZ-Lines',
  'statistics.shuns': 'Shuns',
  'statistics.qLines': 'Q-Lines',
  'statistics.invisible': 'Invisible',
  'logs.tableHeaders.message': 'Message',
  'banExceptions.maskPlaceholder': '*@*.trusted.example.com',
  'banExceptions.gline': 'G-Line',
  'banExceptions.kline': 'K-Line',
  'banExceptions.gzline': 'GZ-Line',
  'banExceptions.zline': 'Z-Line',
  'banExceptions.shun': 'Shun',
  'sidebar.logout': 'Se déconnecter'
};

for (const k of Object.keys(extras)) fr[k] = extras[k];
fs.writeFileSync(frPath, JSON.stringify(fr, null, 2) + '\n', 'utf8');
console.log('Patched fr.json with', Object.keys(extras).length, 'additional translations');
