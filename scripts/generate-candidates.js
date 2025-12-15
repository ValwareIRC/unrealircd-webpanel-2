#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const locale = process.argv[2];
if (!locale) { console.error('Usage: node generate-candidates.js <locale>'); process.exit(1); }
const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-US.json'), 'utf8'));
const locFile = path.join(localesDir, `${locale}.json`);
if (!fs.existsSync(locFile)) { console.error('Locale file missing:', locFile); process.exit(1); }
const target = JSON.parse(fs.readFileSync(locFile, 'utf8'));
function flatten(o, p=''){const r={};for(const k of Object.keys(o)){const v=o[k];const nk=p?`${p}.${k}`:k;if(v&&typeof v==='object'&&!Array.isArray(v))Object.assign(r,flatten(v,nk));else r[nk]=v;}return r}
const flatEn = flatten(en), flatTarget = flatten(target);
const candidates = Object.keys(flatTarget).filter(k => typeof flatTarget[k] === 'string' && flatTarget[k].startsWith('__UNTRANSLATED__')).map(k => ({ key: k, en: flatEn[k] || null, current: flatTarget[k] }));
const outDir = path.join(__dirname, 'generated-translations'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, `${locale}-candidates.json`), JSON.stringify(candidates, null, 2)+'\n', 'utf8');
console.log('Wrote', candidates.length, locale, 'candidates to', path.join(outDir, `${locale}-candidates.json`));
