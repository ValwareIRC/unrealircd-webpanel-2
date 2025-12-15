#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, 'nl-candidates.json');
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

const prefixes = ['commands', 'navigation', 'panelUsers', 'rpcServers', 'webhooks', 'channelTemplates', 'scheduledCommands', 'nameBans', 'serverBans', 'savedSearches', 'watchList', 'userJourney', 'userDetail', 'themeSwitcher'];

const dict = {
  // common
  'Add': 'Toevoegen',
  'Remove': 'Verwijderen',
  'Delete': 'Verwijderen',
  'Edit': 'Bewerken',
  'Save': 'Opslaan',
  'Cancel': 'Annuleren',
  'Search': 'Zoeken',
  'Loading...': 'Laden...',
  'Success': 'Succes',
  'Error': 'Fout',
  'Yes': 'Ja',
  'No': 'Nee',
  'Confirm': 'Bevestigen',
  'View': 'Bekijken',
  'Apply': 'Toepassen',
  'Share with all users': 'Delen met alle gebruikers',
  'Current Search:': 'Huidige zoekopdracht:',

  // navigation / header
  'Go to Dashboard': 'Ga naar Dashboard',
  'View network overview': 'Bekijk netwerkoverzicht',
  'Go to Users': 'Ga naar Gebruikers',
  'View connected users': 'Bekijk verbonden gebruikers',
  'Go to Channels': 'Ga naar Kanalen',
  'View active channels': 'Bekijk actieve kanalen',
  'Go to Servers': 'Ga naar Servers',
  'View linked servers': 'Bekijk gekoppelde servers',
  'Go to Live Map': 'Ga naar Live-kaart',
  'View geographic distribution': 'Bekijk geografische verdeling',
  'Go to Statistics': 'Ga naar Statistieken',
  'View detailed stats': 'Bekijk gedetailleerde statistieken',
  'Go to Logs': 'Ga naar Logboeken',
  'View system logs': 'Bekijk systeemlogboeken',

  // panel / users
  'Sign Out': 'Uitloggen',
  'Log out of the panel': 'Uitloggen van het paneel',

  // nameBans
  'Name Bans': 'Naamverbanningen',
  'Manage Q-Lines (reserved nicknames and channels)': 'Beheer Q-Lines (gereserveerde aliassen en kanalen)',
  'Add Name Ban': 'Naamverbanning toevoegen',
  'Search name bans...': 'Zoek naamverbanningen...',
  'Name/Pattern': 'Naam/Patroon',
  'Use * as wildcard': 'Gebruik * als joker',

  // serverBans
  'Server Bans': 'Serververbanningen',
  'Manage G-Lines, K-Lines, Z-Lines, and Shuns': 'Beheer G-Lines, K-Lines, Z-Lines en Shuns',
  'Add Ban': 'Verbanning toevoegen',
  'Mask': 'Masker',
  'G-Line (Global)': 'G-Line (Globaal)',
  'K-Line (Local)': 'K-Line (Lokaal)',
  'GZ-Line (Global IP)': 'GZ-Line (Globale IP)',
  'Z-Line (Local IP)': 'Z-Line (Lokale IP)',
  'Shun': 'Shun',
  'Are you sure you want to remove this {{type}} for {{name}}?': 'Weet u zeker dat u deze {{type}} voor {{name}} wilt verwijderen?',
  'Ban added successfully': 'Verbanning succesvol toegevoegd',
  'Ban removed': 'Verbanning verwijderd',

  // scheduledCommands
  'Scheduled Commands': 'Geplande opdrachten',
  'Schedule IRC commands to run automatically': 'Plan IRC-opdrachten automatisch',
  'Create Schedule': 'Schema aanmaken',
  'Search commands...': 'Zoek opdrachten...',
  'No scheduled commands': 'Geen geplande opdrachten',
  'Never': 'Nooit',
  'Next': 'Volgende',
  'Status': 'Status',
  'Command': 'Opdracht',
  'Schedule': 'Schema',
  'Last Run': 'Laatste uitvoering',
  'Runs': 'Uitvoeringen',
  'Click to disable': 'Klik om uit te schakelen',
  'Click to enable': 'Klik om in te schakelen',
  'Run now': 'Nu uitvoeren',

  // rpcServers
  'RPC Servers': 'RPC-servers',
  'Configure UnrealIRCd JSON-RPC connections': 'Configureer UnrealIRCd JSON-RPC-verbindingen',
  'Add RPC Server': 'RPC-server toevoegen',
  'Display Name': 'Weergavenaam',
  'Hostname or IP': 'Hostnaam of IP',
  'Port': 'Poort',
  'Default': 'Standaard',
  'Connected': 'Verbonden',
  'Disconnected': 'Verbroken',
  'Test Connection': 'Verbinding testen',
  'Connection successful': 'Verbinding geslaagd',
  'Connection failed: {{message}}': 'Verbinding mislukt: {{message}}',

  // webhooks
  'Webhooks': 'Webhooks',
  'Receive log events from UnrealIRCd via webhooks': 'Ontvang loggebeurtenissen via webhooks',
  'Create Webhook': 'Webhook aanmaken',
  'Learn more about UnrealIRCd log blocks': 'Meer over UnrealIRCd logblokken',
  'View Configuration': 'Configuratie bekijken',
  'View Logs': 'Logs bekijken',
  'Disable': 'Uitschakelen',
  'Enable': 'Inschakelen',
  'Regenerate Token': 'Token opnieuw genereren',
  'No webhook tokens configured': 'Geen webhook-tokens geconfigureerd',

  // channelTemplates
  'Channel Templates': 'Kanaalsjablonen',
  'Save and apply channel configurations as reusable templates': 'Sla kanaalconfiguraties op als herbruikbare sjablonen',
  'Create Template': 'Sjabloon maken',
  'Apply Template': 'Sjabloon toepassen',
  'From Channel': 'Van kanaal',
  'Target Channel': 'Doelkanaal',
  'Make this template available to all users': 'Maak dit sjabloon beschikbaar voor alle gebruikers',
  'Used {{count}} times': 'Gebruikt {{count}} keer',

  // savedSearches
  'Save current search': 'Huidige zoekopdracht opslaan',
  'Enter a search query first': 'Voer eerst een zoekopdracht in',
  'Saved Searches': 'Opgeslagen zoekopdrachten',
  'No saved searches yet.': 'Nog geen opgeslagen zoekopdrachten.',

  // watchList
  'Watch List': 'Watchlist',
  'Monitor users matching specific criteria': 'Gebruikers monitoren die aan criteria voldoen',
  'Add to Watch List': 'Toevoegen aan watchlist',
  'No users in watch list': 'Geen gebruikers in de watchlist',
  'Search by nick, IP, reason...': 'Zoeken op nick, IP, reden...'
};

function translate(en) {
  if (!en) return en;
  if (dict[en]) return dict[en];
  if (/\{\{.*\}\}/.test(en)) return en; // keep templates
  return en; // fallback
}

const out = {};
for (const c of candidates) {
  if (prefixes.some(p => c.key.startsWith(p))) {
    out[c.key] = translate(c.en || c.current.replace(/^__UNTRANSLATED__ \(|\)$/g, ''));
  }
}

if (!fs.existsSync(genDir)) fs.mkdirSync(genDir);
fs.writeFileSync(path.join(genDir, 'nl.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', Object.keys(out).length, 'priority translations to nl.json');
