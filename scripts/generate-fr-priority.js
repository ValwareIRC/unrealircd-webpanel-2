#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, 'fr-candidates.json');
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

const prefixes = ['commands', 'navigation', 'panelUsers', 'rpcServers', 'webhooks', 'channelTemplates', 'scheduledCommands', 'nameBans', 'serverBans', 'savedSearches', 'watchList', 'userJourney', 'userDetail', 'themeSwitcher'];

const dict = {
  // common
  'Add': 'Ajouter',
  'Remove': 'Supprimer',
  'Delete': 'Supprimer',
  'Edit': 'Modifier',
  'Save': 'Enregistrer',
  'Cancel': 'Annuler',
  'Search': 'Rechercher',
  'Loading...': 'Chargement...',
  'Success': 'Succès',
  'Error': 'Erreur',
  'Yes': 'Oui',
  'No': 'Non',
  'Confirm': 'Confirmer',
  'View': 'Afficher',
  'Apply': 'Appliquer',
  'Share with all users': 'Partager avec tous les utilisateurs',
  'Current Search:': 'Recherche actuelle :',

  // navigation / header
  'Go to Dashboard': 'Aller au tableau de bord',
  'View network overview': "Voir l'aperçu du réseau",
  'Go to Users': 'Aller aux utilisateurs',
  'View connected users': 'Voir les utilisateurs connectés',
  'Go to Channels': 'Aller aux canaux',
  'View active channels': 'Voir les canaux actifs',
  'Go to Servers': 'Aller aux serveurs',
  'View linked servers': 'Voir les serveurs liés',
  'Go to Live Map': 'Aller à la carte en direct',
  'View geographic distribution': 'Voir la répartition géographique',
  'Go to Statistics': 'Aller aux statistiques',
  'View detailed stats': 'Voir les statistiques détaillées',
  'Go to Logs': 'Aller aux journaux',
  'View system logs': "Voir les journaux système",
  'Go to Server Bans': 'Aller aux interdictions du serveur',
  'Manage K-Lines, G-Lines, etc.': 'Gérer les K-Lines, G-Lines, etc.',
  'Go to Name Bans': 'Aller aux interdictions de nom',
  'Manage Q-Lines': 'Gérer les Q-Lines',
  'Go to Ban Exceptions': 'Aller aux exceptions de bannissement',
  'Go to Spamfilters': 'Aller aux filtres anti-spam',
  'Go to Watch List': 'Aller à la liste de surveillance',

  // panel / users
  'Sign Out': 'Se déconnecter',
  'Log out of the panel': "Se déconnecter du panneau",

  // nameBans
  'Name Bans': 'Interdictions de nom',
  'Manage Q-Lines (reserved nicknames and channels)': "Gérer les Q-Lines (pseudos et canaux réservés)",
  'Add Name Ban': 'Ajouter une interdiction de nom',
  'Search name bans...': 'Rechercher des interdictions de nom...',
  'Name/Pattern': 'Nom/Modèle',
  'Use * as wildcard': "Utilisez * comme joker",

  // serverBans
  'Server Bans': 'Interdictions de serveur',
  'Manage G-Lines, K-Lines, Z-Lines, and Shuns': 'Gérer les G-Lines, K-Lines, Z-Lines et Shuns',
  'Add Ban': 'Ajouter une interdiction',
  'Mask': 'Masque',
  'G-Line (Global)': 'G-Line (Global)',
  'K-Line (Local)': 'K-Line (Local)',
  'GZ-Line (Global IP)': 'GZ-Line (IP globale)',
  'Z-Line (Local IP)': 'Z-Line (IP locale)',
  'Shun': 'Shun',
  'Are you sure you want to remove this {{type}} for {{name}}?': 'Êtes-vous sûr de vouloir supprimer ce {{type}} pour {{name}} ?',
  'Ban added successfully': 'Interdiction ajoutée avec succès',
  'Ban removed': 'Interdiction supprimée',

  // scheduledCommands
  'Scheduled Commands': 'Commandes planifiées',
  'Schedule IRC commands to run automatically': 'Planifier des commandes IRC à exécuter automatiquement',
  'Create Schedule': 'Créer une programmation',
  'Search commands...': 'Rechercher des commandes...',
  'No scheduled commands': 'Aucune commande planifiée',
  'Never': 'Jamais',
  'Next': 'Suivant',
  'Status': 'Statut',
  'Command': 'Commande',
  'Schedule': 'Planification',
  'Last Run': 'Dernière exécution',
  'Runs': 'Exécutions',
  'Click to disable': 'Cliquer pour désactiver',
  'Click to enable': 'Cliquer pour activer',
  'Run now': 'Exécuter maintenant',

  // rpcServers
  'RPC Servers': 'Serveurs RPC',
  'Configure UnrealIRCd JSON-RPC connections': "Configurer les connexions JSON-RPC d'UnrealIRCd",
  'Add RPC Server': 'Ajouter un serveur RPC',
  'Display Name': "Nom d'affichage",
  'Hostname or IP': "Nom d'hôte ou IP",
  'Port': 'Port',
  'Default': 'Par défaut',
  'Connected': 'Connecté',
  'Disconnected': 'Déconnecté',
  'Test Connection': 'Tester la connexion',
  'Connection successful': 'Connexion réussie',
  'Connection failed: {{message}}': 'Échec de la connexion : {{message}}',

  // webhooks
  'Webhooks': 'Webhooks',
  'Receive log events from UnrealIRCd via webhooks': "Recevoir des événements de log d'UnrealIRCd via webhooks",
  'Create Webhook': 'Créer un webhook',
  'Learn more about UnrealIRCd log blocks': "En savoir plus sur les blocs de log d'UnrealIRCd",
  'View Configuration': 'Voir la configuration',
  'View Logs': 'Voir les logs',
  'Disable': 'Désactiver',
  'Enable': 'Activer',
  'Regenerate Token': 'Régénérer le jeton',
  'No webhook tokens configured': "Aucun jeton webhook configuré",

  // channelTemplates
  'Channel Templates': 'Modèles de canal',
  'Save and apply channel configurations as reusable templates': "Enregistrer et appliquer des configurations de canal comme modèles réutilisables",
  'Create Template': 'Créer un modèle',
  'Apply Template': 'Appliquer le modèle',
  'From Channel': 'Depuis le canal',
  'Target Channel': 'Canal cible',
  'Make this template available to all users': 'Rendre ce modèle disponible à tous les utilisateurs',
  'Used {{count}} times': 'Utilisé {{count}} fois',

  // savedSearches
  'Save current search': 'Enregistrer la recherche actuelle',
  'Enter a search query first': 'Saisissez d\'abord une requête de recherche',
  'Saved Searches': 'Recherches enregistrées',
  'No saved searches yet.': 'Aucune recherche enregistrée pour le moment.',

  // watchList
  'Watch List': 'Liste de surveillance',
  'Monitor users matching specific criteria': 'Surveiller les utilisateurs correspondant à des critères spécifiques',
  'Add to Watch List': 'Ajouter à la liste de surveillance',
  'No users in watch list': 'Aucun utilisateur dans la liste de surveillance',
  'Search by nick, IP, reason...': 'Rechercher par pseudo, IP, raison...'
};

function translate(en) {
  if (!en) return en;
  if (dict[en]) return dict[en];
  // preserve templates and punctuation
  if (/\{\{.*\}\}/.test(en)) {
    return en.replace('Are you sure', 'Êtes-vous sûr').replace('Are you sure you want to', 'Êtes-vous sûr de vouloir');
  }
  return en; // fallback to en
}

const out = {};
for (const c of candidates) {
  if (prefixes.some(p => c.key.startsWith(p))) {
    out[c.key] = translate(c.en || c.current.replace(/^__UNTRANSLATED__ \(|\)$/g, ''));
  }
}

if (!fs.existsSync(genDir)) fs.mkdirSync(genDir);
fs.writeFileSync(path.join(genDir, 'fr.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', Object.keys(out).length, 'priority translations to fr.json');
