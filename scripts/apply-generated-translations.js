#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const generatedDir = path.join(__dirname, 'generated-translations');
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

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

function main() {
  const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const localeName = file.replace('.json', '') + '.json';
    const translations = readJSON(path.join(generatedDir, file));
    const localePath = path.join(localesDir, localeName);
    if (!fs.existsSync(localePath)) {
      console.warn('Locale file missing:', localePath);
      continue;
    }
    const locale = readJSON(localePath);
    const flat = flatten(locale);
    for (const key of Object.keys(translations)) {
      flat[key] = translations[key];
    }
    const updated = unflatten(flat);
    writeJSON(localePath, updated);
    console.log('Applied translations for', localeName);
  }
}

main();
