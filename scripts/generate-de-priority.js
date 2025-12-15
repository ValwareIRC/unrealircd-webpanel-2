#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const locale = process.argv[2] || 'de';
const prefixes = process.argv.slice(3);
if (!prefixes.length) prefixes.push('navigation', 'common', 'dashboard', 'header', 'auth', 'users', 'servers', 'channels', 'marketplace', 'panelUsers', 'rpcServers', 'alertRules', 'serverBans.spamfilters', 'themeSwitcher', 'savedSearches', 'watchList');

const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, `${locale}-candidates.json`);
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

// Minimal translation dictionary for German
const dict = {
  'Dashboard': 'Instrumententafel',
  'Welcome': 'Willkommen',
  'Save': 'Speichern',
  'Cancel': 'Abbrechen',
  'Logout': 'Abmelden',
  'Login': 'Anmelden',
  'Users': 'Benutzer',
  'Servers': 'Server',
  'Channels': 'Kanäle',
  'Statistics': 'Statistiken',
  'Plugins': 'Plugins',
  'Settings': 'Einstellungen',
  'Search': 'Suchen',
  'Add': 'Hinzufügen',
  'Edit': 'Bearbeiten',
  'Delete': 'Löschen',
  'Description': 'Beschreibung',
  'IP': 'IP',
  'TLS': 'TLS',
  'Apply': 'Anwenden',
  'Reset': 'Zurücksetzen',
  'Theme Settings': 'Theme-Einstellungen',
  'Marketplace': 'Marktplatz',
  'Panel Users': 'Panel-Benutzer',
  'Save Changes': 'Änderungen speichern',
  'Connection successful': 'Verbindung erfolgreich',
  'Connection failed': 'Verbindung fehlgeschlagen'
};

function translateText(en) {
  if (!en) return en;
  if (dict[en]) return dict[en];
  if (en.match(/^\W*\{\{.*\}\}/)) return en;
  return en;
}

const out = {};
for (const c of candidates) {
  if (prefixes.some(p => c.key.startsWith(p))) {
    out[c.key] = translateText(c.en || c.current.replace(/^__UNTRANSLATED__ \(|\)$/g, ''));
  }
}

if (!fs.existsSync(genDir)) fs.mkdirSync(genDir);
fs.writeFileSync(path.join(genDir, `${locale}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', Object.keys(out).length, `priority translations to ${locale}.json`);
