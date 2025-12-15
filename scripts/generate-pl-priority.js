#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, 'pl-candidates.json');
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

const prefixes = ['commands', 'navigation', 'panelUsers', 'rpcServers', 'webhooks', 'channelTemplates', 'scheduledCommands', 'nameBans', 'serverBans', 'savedSearches', 'watchList', 'userJourney', 'userDetail', 'themeSwitcher'];

const dict = {
  // common
  'Add': 'Dodaj',
  'Remove': 'Usuń',
  'Delete': 'Usuń',
  'Edit': 'Edytuj',
  'Save': 'Zapisz',
  'Cancel': 'Anuluj',
  'Search': 'Szukaj',
  'Loading...': 'Ładowanie...',
  'Success': 'Sukces',
  'Error': 'Błąd',
  'Yes': 'Tak',
  'No': 'Nie',
  'Confirm': 'Potwierdź',
  'View': 'Wyświetl',
  'Apply': 'Zastosuj',
  'Share with all users': 'Udostępnij wszystkim użytkownikom',
  'Current Search:': 'Bieżące wyszukiwanie:',

  // navigation / header
  'Go to Dashboard': 'Przejdź do panelu',
  'View network overview': 'Zobacz przegląd sieci',
  'Go to Users': 'Przejdź do użytkowników',
  'View connected users': 'Zobacz połączonych użytkowników',
  'Go to Channels': 'Przejdź do kanałów',
  'View active channels': 'Zobacz aktywne kanały',
  'Go to Servers': 'Przejdź do serwerów',
  'View linked servers': 'Zobacz połączone serwery',
  'Go to Live Map': 'Przejdź do mapy na żywo',
  'View geographic distribution': 'Zobacz rozkład geograficzny',
  'Go to Statistics': 'Przejdź do statystyk',
  'View detailed stats': 'Zobacz szczegółowe statystyki',
  'Go to Logs': 'Przejdź do logów',
  'View system logs': 'Zobacz logi systemowe',

  // panel / users
  'Sign Out': 'Wyloguj się',
  'Log out of the panel': 'Wyloguj się z panelu',

  // nameBans
  'Name Bans': 'Blokady nazw',
  'Manage Q-Lines (reserved nicknames and channels)': 'Zarządzaj Q-Lines (zarezerwowane nicki i kanały)',
  'Add Name Ban': 'Dodaj blokadę nazwy',
  'Search name bans...': 'Szukaj blokad nazw...',
  'Name/Pattern': 'Nazwa/Wzorzec',
  'Use * as wildcard': 'Użyj * jako symbolu wieloznacznego',

  // serverBans
  'Server Bans': 'Blokady serwera',
  'Manage G-Lines, K-Lines, Z-Lines, and Shuns': 'Zarządzaj G-Lines, K-Lines, Z-Lines i Shuns',
  'Add Ban': 'Dodaj blokadę',
  'Mask': 'Maska',
  'G-Line (Global)': 'G-Line (Globalna)',
  'K-Line (Local)': 'K-Line (Lokalna)',
  'GZ-Line (Global IP)': 'GZ-Line (Globalne IP)',
  'Z-Line (Local IP)': 'Z-Line (Lokalne IP)',
  'Shun': 'Shun',
  'Are you sure you want to remove this {{type}} for {{name}}?': 'Czy na pewno chcesz usunąć ten {{type}} dla {{name}}?',
  'Ban added successfully': 'Blokada dodana pomyślnie',
  'Ban removed': 'Blokada usunięta',

  // scheduledCommands
  'Scheduled Commands': 'Zaplanowane polecenia',
  'Schedule IRC commands to run automatically': 'Zaplanowane wykonanie poleceń IRC',
  'Create Schedule': 'Utwórz harmonogram',
  'Search commands...': 'Szukaj poleceń...',
  'No scheduled commands': 'Brak zaplanowanych poleceń',
  'Never': 'Nigdy',
  'Next': 'Następne',
  'Status': 'Status',
  'Command': 'Polecenie',
  'Schedule': 'Harmonogram',
  'Last Run': 'Ostatnie uruchomienie',
  'Runs': 'Uruchomienia',
  'Click to disable': 'Kliknij, aby wyłączyć',
  'Click to enable': 'Kliknij, aby włączyć',
  'Run now': 'Uruchom teraz',

  // rpcServers
  'RPC Servers': 'Serwery RPC',
  'Configure UnrealIRCd JSON-RPC connections': 'Skonfiguruj połączenia JSON-RPC UnrealIRCd',
  'Add RPC Server': 'Dodaj serwer RPC',
  'Display Name': 'Nazwa wyświetlana',
  'Hostname or IP': 'Nazwa hosta lub IP',
  'Port': 'Port',
  'Default': 'Domyślny',
  'Connected': 'Połączony',
  'Disconnected': 'Rozłączony',
  'Test Connection': 'Przetestuj połączenie',
  'Connection successful': 'Połączenie udane',
  'Connection failed: {{message}}': 'Połączenie nieudane: {{message}}',

  // webhooks
  'Webhooks': 'Webhooki',
  'Receive log events from UnrealIRCd via webhooks': 'Odbieraj zdarzenia logów z UnrealIRCd przez webhooki',
  'Create Webhook': 'Utwórz webhook',
  'Learn more about UnrealIRCd log blocks': 'Dowiedz się więcej o blokach logowania UnrealIRCd',
  'View Configuration': 'Pokaż konfigurację',
  'View Logs': 'Pokaż logi',
  'Disable': 'Wyłącz',
  'Enable': 'Włącz',
  'Regenerate Token': 'Odnów token',
  'No webhook tokens configured': 'Brak skonfigurowanych tokenów webhook',

  // channelTemplates
  'Channel Templates': 'Szablony kanału',
  'Save and apply channel configurations as reusable templates': 'Zapisz i zastosuj konfiguracje kanału jako szablony',
  'Create Template': 'Utwórz szablon',
  'Apply Template': 'Zastosuj szablon',
  'From Channel': 'Z kanału',
  'Target Channel': 'Kanał docelowy',
  'Make this template available to all users': 'Udostępnij ten szablon wszystkim użytkownikom',
  'Used {{count}} times': 'Użyto {{count}} razy',

  // savedSearches
  'Save current search': 'Zapisz bieżące wyszukiwanie',
  'Enter a search query first': 'Najpierw wprowadź zapytanie',
  'Saved Searches': 'Zapisane wyszukiwania',
  'No saved searches yet.': 'Brak zapisanych wyszukiwań',

  // watchList
  'Watch List': 'Lista obserwacji',
  'Monitor users matching specific criteria': 'Monitoruj użytkowników spełniających określone kryteria',
  'Add to Watch List': 'Dodaj do listy obserwacji',
  'No users in watch list': 'Brak użytkowników na liście obserwacji',
  'Search by nick, IP, reason...': 'Szukaj po nicku, IP, powodzie...'
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
fs.writeFileSync(path.join(genDir, 'pl.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', Object.keys(out).length, 'priority translations to pl.json');
