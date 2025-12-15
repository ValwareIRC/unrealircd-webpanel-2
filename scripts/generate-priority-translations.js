#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const locale = process.argv[2] || 'tr';
const prefixes = process.argv.slice(3);
if (!prefixes.length) prefixes.push('navigation', 'common', 'dashboard', 'header', 'auth', 'users', 'servers', 'channels', 'marketplace', 'panelUsers', 'rpcServers', 'alertRules', 'serverBans.spamfilters', 'themeSwitcher', 'savedSearches', 'watchList');

const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, `${locale}-candidates.json`);
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

// Minimal translation dictionary for Turkish (improve as we go)
const dict = {
  'Dashboard': 'Panolar',
  'Dashboard': 'Pano',
  'Welcome': 'Hoş geldiniz',
  'Save': 'Kaydet',
  'Cancel': 'İptal',
  'Logout': 'Çıkış Yap',
  'Login': 'Giriş',
  'Users': 'Kullanıcılar',
  'Servers': 'Sunucular',
  'Channels': 'Kanallar',
  'Statistics': 'İstatistikler',
  'Plugins': 'Eklentiler',
  'Settings': 'Ayarlar',
  'Search': 'Ara',
  'Add': 'Ekle',
  'Edit': 'Düzenle',
  'Delete': 'Sil',
  'Description': 'Açıklama',
  'IP': 'IP',
  'TLS': 'TLS',
  'Apply': 'Uygula',
  'Reset': 'Sıfırla',
  'Theme Settings': 'Tema Ayarları',
  'Market': 'Pazar',
  'Marketplace': 'Market',
  'Panel Users': 'Panel Kullanıcıları'
};

function translateText(en) {
  if (!en) return en;
  // If already short and exists in dict, use it
  if (dict[en]) return dict[en];
  // For common patterns keep tokens
  if (en.match(/^\W*\{\{.*\}\}/)) return en;
  // Fallback: return original English (we'll refine later)
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
