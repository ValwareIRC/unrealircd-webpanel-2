#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const locale = process.argv[2] || 'es';
const prefixes = process.argv.slice(3);
if (!prefixes.length) prefixes.push(
  'navigation', 'common', 'dashboard', 'header', 'auth', 'users', 'servers', 'channels', 'marketplace', 'panelUsers', 'rpcServers', 'alertRules',
  'serverBans.spamfilters', 'serverBans', 'nameBans', 'banExceptions', 'statistics', 'commands', 'themeSwitcher', 'savedSearches', 'watchList', 'logs', 'sidebar', 'channelDetail'
);

const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, `${locale}-candidates.json`);
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

// Spanish minimal dictionary for common UI text
const dict = {
  'Dashboard': 'Panel',
  'Welcome': 'Bienvenido',
  'Save': 'Guardar',
  'Cancel': 'Cancelar',
  'Logout': 'Cerrar sesión',
  'Login': 'Iniciar sesión',
  'Users': 'Usuarios',
  'Servers': 'Servidores',
  'Channels': 'Canales',
  'Statistics': 'Estadísticas',
  'Plugins': 'Complementos',
  'Settings': 'Ajustes',
  'Search': 'Buscar',
  'Add': 'Añadir',
  'Edit': 'Editar',
  'Delete': 'Eliminar',
  'Description': 'Descripción',
  'IP': 'IP',
  'TLS': 'TLS',
  'Apply': 'Aplicar',
  'Reset': 'Restablecer',
  'Theme Settings': 'Ajustes de tema',
  'Marketplace': 'Mercado',
  'Panel Users': 'Usuarios del panel',
  'RPC Servers': 'Servidores RPC',
  'Alert Rules': 'Reglas de alerta',
  'Spamfilters': 'Filtros anti-spam',
  'Watch List': 'Lista de vigilancia',
  'Log Viewer': 'Visor de registros',
  'Start Live': 'Iniciar en vivo',
  'Stop Live': 'Detener en vivo',
  'Live': 'En vivo',
  'No entries found': 'No se encontraron entradas',
  'Type': 'Tipo',
  'Mask': 'Máscara',
  'Reason': 'Motivo',
  'Expires': 'Caduca',
  'Add Ban': 'Añadir prohibición',
  'Add Name Ban': 'Añadir prohibición de nombre',
  'Name Bans': 'Prohibiciones de nombre',
  'Server Bans': 'Prohibiciones del servidor',
  'G-Line': 'G-Line',
  'K-Line': 'K-Line',
  'Z-Line': 'Z-Line',
  'GZ-Line': 'GZ-Line',
  'Shun': 'Shun',
  'Enter ban reason': 'Introduzca el motivo de la prohibición',
  'Are you sure you want to remove this {{type}} for {{name}}?': '¿Está seguro de que desea eliminar este {{type}} para {{name}}?'
};

function translateText(en) {
  if (!en) return en;
  if (dict[en]) return dict[en];
  // Simple pattern-based translations
  if (en.startsWith('Go to ')) return `Ir a ${en.slice(6)}`;
  if (en.startsWith('View ')) return `Ver ${en.slice(5)}`;
  if (en.startsWith('No ')) return `No ${en.slice(3)}`;
  // keep variables intact and return English as fallback (so it's better than placeholder)
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
