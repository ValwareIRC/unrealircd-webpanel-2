#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir,'en-US.json'),'utf8'));
const zh = JSON.parse(fs.readFileSync(path.join(localesDir,'zh.json'),'utf8'));
function flatten(obj,prefix=''){const res={};for(const k of Object.keys(obj)){const v=obj[k];const nk=prefix?`${prefix}.${k}`:k;if(v&&typeof v==='object'&&!Array.isArray(v)){Object.assign(res,flatten(v,nk))}else res[nk]=v}return res}
const ef=flatten(en);const zf=flatten(zh);
const missing=Object.keys(ef).filter(k=>zf[k]===undefined);
console.log('en-US-only keys:',missing.length);
if(missing.length>0) console.log(missing.slice(0,200).join('\n'));
