#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const candPath = path.join(genDir, 'ja-candidates.json');
if (!fs.existsSync(candPath)) { console.error('Candidates missing:', candPath); process.exit(1); }
const candidates = JSON.parse(fs.readFileSync(candPath, 'utf8'));

const prefixes = ['commands', 'navigation', 'panelUsers', 'rpcServers', 'webhooks', 'channelTemplates', 'scheduledCommands', 'nameBans', 'serverBans', 'savedSearches', 'watchList', 'userJourney', 'userDetail', 'themeSwitcher'];

const dict = {
  // common
  'Add': '追加',
  'Remove': '削除',
  'Delete': '削除',
  'Edit': '編集',
  'Save': '保存',
  'Cancel': 'キャンセル',
  'Search': '検索',
  'Loading...': '読み込み中...',
  'Success': '成功',
  'Error': 'エラー',
  'Yes': 'はい',
  'No': 'いいえ',
  'Confirm': '確認',
  'View': '表示',
  'Apply': '適用',
  'Share with all users': 'すべてのユーザーと共有',
  'Current Search:': '現在の検索:',

  // navigation
  'Go to Dashboard': 'ダッシュボードへ',
  'View network overview': 'ネットワークの概要を表示',
  'Go to Users': 'ユーザーへ',
  'View connected users': '接続中のユーザーを表示',
  'Go to Channels': 'チャンネルへ',
  'View active channels': 'アクティブなチャンネルを表示',
  'Go to Servers': 'サーバーへ',
  'View linked servers': 'リンクされたサーバーを表示',
  'Go to Live Map': 'ライブマップへ',
  'View geographic distribution': '地理的分布を表示',
  'Go to Statistics': '統計へ',
  'View detailed stats': '詳細な統計を表示',
  'Go to Logs': 'ログへ',
  'View system logs': 'システムログを表示',

  // panel / users
  'Sign Out': 'サインアウト',
  'Log out of the panel': 'パネルからログアウト',

  // nameBans
  'Name Bans': '名前禁止',
  'Manage Q-Lines (reserved nicknames and channels)': 'Q-Line（予約されたニックネームとチャンネル）を管理',
  'Add Name Ban': '名前禁止を追加',
  'Search name bans...': '名前禁止を検索...',
  'Name/Pattern': '名前/パターン',
  'Use * as wildcard': '* をワイルドカードとして使用',

  // serverBans
  'Server Bans': 'サーバー禁止',
  'Manage G-Lines, K-Lines, Z-Lines, and Shuns': 'G-Line、K-Line、Z-Line、Shunを管理',
  'Add Ban': '禁止を追加',
  'Mask': 'マスク',
  'G-Line (Global)': 'G-Line（グローバル）',
  'K-Line (Local)': 'K-Line（ローカル）',
  'GZ-Line (Global IP)': 'GZ-Line（グローバルIP）',
  'Z-Line (Local IP)': 'Z-Line（ローカルIP）',
  'Shun': 'Shun',

  // scheduledCommands
  'Scheduled Commands': 'スケジュールされたコマンド',
  'Schedule IRC commands to run automatically': 'IRCコマンドを自動実行するようスケジュール',
  'Create Schedule': 'スケジュールを作成',
  'Search commands...': 'コマンドを検索...',
  'No scheduled commands': 'スケジュールされたコマンドはありません',
  'Never': 'なし',
  'Next': '次へ',
  'Status': '状態',
  'Command': 'コマンド',
  'Schedule': 'スケジュール',
  'Last Run': '最終実行',
  'Runs': '実行回数',
  'Click to disable': 'クリックして無効化',
  'Click to enable': 'クリックして有効化',
  'Run now': '今すぐ実行',

  // rpcServers
  'RPC Servers': 'RPCサーバー',
  'Configure UnrealIRCd JSON-RPC connections': 'UnrealIRCdのJSON-RPC接続を設定',
  'Add RPC Server': 'RPCサーバーを追加',
  'Display Name': '表示名',
  'Hostname or IP': 'ホスト名またはIP',
  'Port': 'ポート',
  'Default': 'デフォルト',
  'Connected': '接続済み',
  'Disconnected': '未接続',

  // webhooks
  'Webhooks': 'Webhook',
  'Receive log events from UnrealIRCd via webhooks': 'WebhookでUnrealIRCdのログイベントを受信',
  'Create Webhook': 'Webhookを作成',
  'View Configuration': '設定を表示',
  'View Logs': 'ログを表示',
  'Disable': '無効',
  'Enable': '有効',
  'Regenerate Token': 'トークンを再生成',
  'No webhook tokens configured': 'Webhookトークンは設定されていません',

  // channelTemplates
  'Channel Templates': 'チャンネルテンプレート',
  'Save and apply channel configurations as reusable templates': 'チャンネル設定をテンプレートとして保存・適用',
  'Create Template': 'テンプレートを作成',
  'Apply Template': 'テンプレートを適用',
  'From Channel': 'チャンネルから',
  'Target Channel': 'ターゲットチャンネル',
  'Make this template available to all users': 'このテンプレートを全ユーザーに公開',
  'Used {{count}} times': '{{count}} 回使用',

  // savedSearches
  'Save current search': '現在の検索を保存',
  'Enter a search query first': 'まず検索クエリを入力してください',
  'Saved Searches': '保存された検索',
  'No saved searches yet.': '保存された検索はありません',

  // watchList
  'Watch List': '監視リスト',
  'Monitor users matching specific criteria': '特定の条件に合うユーザーを監視',
  'Add to Watch List': '監視リストに追加',
  'No users in watch list': '監視リストにユーザーがいません',
  'Search by nick, IP, reason...': 'ニック、IP、理由で検索...'
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
fs.writeFileSync(path.join(genDir, 'ja.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', Object.keys(out).length, 'priority translations to ja.json');
