// 앱의 사용 설명서(src/screens/settings/UserGuideScreen.tsx의 BLOCKS)를 읽어
// index.html의 <!-- GUIDE:START --> ~ <!-- GUIDE:END --> 사이를 다시 채운다.
// 앱 설명서를 고친 뒤 이 파일을 다시 실행하면 홈페이지도 같은 글이 된다(원문은 앱 한 곳).
// 실행: node tools/build-guide.js <Indwell 앱 폴더>
const fs = require('fs');
const path = require('path');

const appDir = process.argv[2];
if (!appDir) { console.error('앱 폴더 경로가 필요합니다'); process.exit(1); }
const src = fs.readFileSync(path.join(appDir, 'src/screens/settings/UserGuideScreen.tsx'), 'utf8');
const m = src.match(/const BLOCKS: GuideBlock\[\] = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('BLOCKS를 찾지 못했습니다'); process.exit(1); }
const blocks = Function('"use strict"; return ' + m[1])();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 앱과 같은 표기: **…** 굵게, 줄바꿈 \n → <br>
const inline = (s) => esc(s).split('**').map((part, i) => (i % 2 ? `<strong>${part}</strong>` : part)).join('').replace(/\n/g, '<br>');

const html = blocks.map((b) => {
  switch (b.type) {
    case 'head':
      return `<header class="g-head"><img src="img/logo.png" alt="Indwell"><p class="g-sub">${inline(b.subtitle)}</p>${b.caption ? `<p class="g-cap">${inline(b.caption)}</p>` : ''}</header>`;
    case 'h': return `<h3 class="g-h">${inline(b.text)}</h3>`;
    case 'sub': return `<h4 class="g-s">${inline(b.text)}</h4>`;
    case 'p': return `<p class="g-p">${inline(b.text)}</p>`;
    case 'em': return `<p class="g-em">${inline(b.text)}</p>`;
    case 'rule': return '<hr class="g-rule">';
    case 'logo': return '<img class="g-end" src="img/logo.png" alt="Indwell">';
    default: throw new Error('모르는 블록: ' + b.type);
  }
}).join('\n');

const page = path.join(__dirname, '..', 'index.html');
const doc = fs.readFileSync(page, 'utf8');
const re = /(<!-- GUIDE:START -->)[\s\S]*?(<!-- GUIDE:END -->)/;
if (!re.test(doc)) { console.error('index.html에 GUIDE 표시가 없습니다'); process.exit(1); }
fs.writeFileSync(page, doc.replace(re, `$1\n${html}\n$2`));
console.log(`블록 ${blocks.length}개를 옮겼습니다`);
