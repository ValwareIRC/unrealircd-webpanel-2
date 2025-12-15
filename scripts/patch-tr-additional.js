#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const genDir = path.join(__dirname, 'generated-translations');
const trPath = path.join(genDir, 'tr.json');
if (!fs.existsSync(trPath)) { console.error('tr.json missing:', trPath); process.exit(1); }
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

const extras = {
  'statistics.gLines': 'G-Lines',
  'statistics.kLines': 'K-Lines',
  'statistics.zLines': 'Z-Lines',
  'statistics.gzLines': 'GZ-Lines',
  'statistics.shuns': 'Shuns',
  'statistics.qLines': 'Q-Lines',
  'banExceptions.maskPlaceholder': '*@*.trusted.example.com',
  'banExceptions.gline': "G-Line (Genel)",
  'banExceptions.kline': "K-Line (Yerel)",
  'banExceptions.gzline': "GZ-Line (Genel IP)",
  'banExceptions.zline': "Z-Line (Yerel IP)",
  'banExceptions.shun': 'Shun',
  'sidebar.logout': 'Çıkış Yap',
  'channelTemplates.title': 'Kanal Şablonları',
  'channelTemplates.subtitle': 'Kanal yapılandırmalarını şablon olarak kaydedip uygulayın',
  'channelTemplates.fromChannel': "Kanal'dan",
  'channelTemplates.createButton': 'Şablon Oluştur',
  'channelTemplates.empty': 'Henüz kanal şablonu yok. Oluşturun veya mevcut bir kanaldan içe aktarın.',
  'channelTemplates.tooltips.global': 'Genel şablon',
  'channelTemplates.tooltips.private': 'Özel',
  'channelTemplates.tooltips.applyToChannel': 'Kanala uygula',
  'channelTemplates.tooltips.duplicate': 'Çoğalt',
  'channelTemplates.labels.modes': 'Modlar:',
  'channelTemplates.labels.topic': 'Konu:'
};

// Additional form strings
extras['channelTemplates.used'] = 'Kullanım sayısı: {{count}}';
extras['channelTemplates.by'] = 'tarafından';
extras['channelTemplates.deleteConfirm'] = 'Bu şablonu silmek istediğinize emin misiniz?';
extras['channelTemplates.form.name'] = 'Ad';
extras['channelTemplates.form.placeholders.name'] = 'Örn. Destek Kanalı Şablonu';
extras['channelTemplates.form.placeholders.description'] = 'Opsiyonel açıklama';
extras['channelTemplates.form.placeholders.modes'] = 'Örn. +nt';
extras['channelTemplates.form.placeholders.topic'] = 'Kanal konusu';
extras['channelTemplates.form.placeholders.selectChannel'] = 'Bir kanal seçin...';
extras['channelTemplates.form.description'] = 'Açıklama';
extras['channelTemplates.form.modes'] = 'Modlar';
extras['channelTemplates.form.topic'] = 'Konu';
extras['channelTemplates.form.makeGlobal'] = 'Bu şablonu tüm kullanıcılar için kullanılabilir yap';
extras['channelTemplates.form.updateButton'] = 'Güncelle';
extras['channelTemplates.form.createButton'] = 'Oluştur';
extras['channelTemplates.form.targetChannel'] = 'Hedef Kanal';
extras['channelTemplates.editModal.title'] = 'Şablonu Düzenle';
extras['channelTemplates.createModal.title'] = 'Şablon Oluştur';
extras['channelTemplates.applyModal.title'] = 'Şablonu Uygula';
extras['channelTemplates.applyModal.subtitle'] = '"{{name}}" şablonunu bir kanala uygula:';
extras['channelTemplates.applyModal.applyButton'] = 'Şablonu Uygula';
extras['channelTemplates.createFromChannel.title'] = 'Kanalden Oluştur';
extras['channelTemplates.createFromChannel.description'] = 'Mevcut bir kanalın yapılandırmasından yeni bir şablon oluşturun:';

for (const k of Object.keys(extras)) tr[k] = extras[k];
fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');
console.log('Patched tr.json with', Object.keys(extras).length, 'additional translations');
