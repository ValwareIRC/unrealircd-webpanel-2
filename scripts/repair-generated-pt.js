#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'generated-translations', 'pt.json');
if (!fs.existsSync(p)) { console.error('missing', p); process.exit(1); }
const s = fs.readFileSync(p, 'utf8');
// Extract all top-level JSON objects by scanning for balanced braces
const objs = [];
let depth = 0;
let start = null;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{') {
    if (depth === 0) start = i;
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0 && start !== null) {
      const txt = s.slice(start, i + 1);
      try {
        objs.push(JSON.parse(txt));
      } catch (e) {
        console.error('Failed to parse object:', e.message);
      }
      start = null;
    }
  }
}
if (objs.length > 1) {
  const merged = Object.assign({}, ...objs);
  fs.writeFileSync(p, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log('Repaired', p, '(merged', objs.length, 'objects)');
} else if (objs.length === 1) {
  console.log('Single JSON object present; no repair needed');
} else {
  console.error('No JSON objects found to repair in', p);
}
