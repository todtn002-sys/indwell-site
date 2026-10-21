// Indwell 웹사이트 움직임. 글은 index.html, 모양은 site.css.
// index.html의 <head>에서 defer로 불러온다 → 페이지 글이 다 읽힌 뒤 위에서부터 차례로 실행.
// 고치면 index.html의 site.js 주소 뒤 ?v= 날짜도 바꿀 것.

// ── 따라오는 메뉴 띠 ──
// 맨 위 메뉴를 띠에 복사하고, 맨 위 메뉴가 화면 밖으로 나가면 띠를 보여 준다.
// 이 부분은 아래 '사용법 창'보다 앞에 있어야 복사된 '사용법'도 창을 연다.
(function () {
  var bar = document.querySelector('.stickybar');
  var top = document.querySelector('.topbar');
  bar.firstElementChild.appendChild(top.querySelector('.nav-right').cloneNode(true));
  function setShown(on) {
    bar.classList.toggle('show', on);
    bar.setAttribute('aria-hidden', on ? 'false' : 'true');
    bar.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
  }
  new IntersectionObserver(function (es) { setShown(!es[0].isIntersecting); }).observe(top);
})();

// ── 사용법 창 ──
// '사용법'을 누르면 설명서 창을 열고, ✕·바깥 누르기·Esc로 닫는다
(function () {
  var dlg = document.getElementById('guide');
  function open(e) { if (e) e.preventDefault(); if (!dlg.open) { dlg.showModal(); dlg.querySelector('.g-body').scrollTop = 0; } }
  document.querySelectorAll('.open-guide').forEach(function (a) { a.addEventListener('click', open); });
  dlg.querySelector('.g-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  if (location.hash === '#guide') open();
})();

// ── 공용: 스크롤·창 크기 바뀜을 한 화면 그리기마다 한 번으로 모아 계산 ──
// 스크롤에 따라 바뀌는 일은 모두 onScroll(함수)로 등록한다(각자 scroll 이벤트를 따로 걸지 말 것).
var onScroll = (function () {
  var fns = [], queued = false;
  function run() { queued = false; fns.forEach(function (f) { f(); }); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  return function (f) { fns.push(f); queue(); };
})();
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }   // 처음·끝이 부드러운 0→1

// ── 그림 속 종이에 손으로 쓴 글(.ov)·붙인 사진(.pasted) ──
// 글 상자를 '종이 한 장'(가로 BOX, 세로는 그 종이의 실제 비율)으로 만들고, 그림에서 잰 종이의 네 모서리에 원근 변환으로 붙인다.
//   data-quad="x,y x,y x,y x,y"   가로 그림(1536×1024)에서 종이의 왼위·오위·오아래·왼아래 (그림 폭·높이의 %)
//   data-quad-p="…"               휴대폰 세로판(1024×1536)의 같은 종이. 세로판이 없는 그림은 생략
//   data-pad="위 오른쪽 아래 왼쪽"  종이 안 여백(%). 위·아래는 종이 높이, 좌우는 종이 폭 기준 (세로판만 다르면 data-pad-p)
//   data-fs="34"                  가장 큰 글자 크기(종이 폭 BOX 기준). 글이 여백 안에 다 들어갈 때까지 줄여 맞춘다
//   data-pen                      필기구(잉크 색은 site.css)
// .pasted(종이에 붙인 사진)도 같은 방식으로 종이에 붙는다 — 글자 맞추기만 하지 않는다. 기울기는 site.css에서 아주 조금만.
// 글자마다 아주 작은 기울기·높낮이를 줘 손으로 쓴 결을 낸다(같은 글은 늘 같은 모양 — 순번으로 정한 흔들림).
// 그림을 바꾸면 그 그림의 네 모서리를 다시 재서 data-quad를 고칠 것(눈대중 금지).
var PORTRAIT = matchMedia('(max-width: 700px) and (orientation: portrait)');   // site.css·index.html의 휴대폰 세로 조건과 같게
var inkReady = (function () {
  var BOX = 400, els = [].slice.call(document.querySelectorAll('[data-quad]')), texts = els.filter(function (el) { return el.classList.contains('ov'); });
  function solve(A, b) {   // 8×8 연립방정식(가우스 소거)
    for (var i = 0; i < 8; i++) {
      var m = i; for (var r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
      var t = A[i]; A[i] = A[m]; A[m] = t; t = b[i]; b[i] = b[m]; b[m] = t;
      for (r = i + 1; r < 8; r++) { var f = A[r][i] / A[i][i]; for (var c = i; c < 8; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    var x = []; for (i = 7; i >= 0; i--) { var sum = b[i]; for (c = i + 1; c < 8; c++) sum -= A[i][c] * x[c]; x[i] = sum / A[i][i]; } return x;
  }
  function homography(w, h, q) {   // 사각형(0,0,w,h) → 네 점 q 로 보내는 원근 변환
    var src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = q[i][0], v = q[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var k = solve(A, b);
    return 'matrix3d(' + [k[0], k[3], 0, k[6], k[1], k[4], 0, k[7], 0, 0, 1, 0, k[2], k[5], 0, 1].join(',') + ')';
  }
  function handwrite(el, n) {   // 글자를 .c로 감싸고(줄바꿈은 낱말 단위) 흔들림을 준다. 화면 읽기에는 원래 문장을 통째로
    var seed = n * 97 + 13, i = 0, full = el.textContent.replace(/\s+/g, ' ').trim();
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - .5; }
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 1) { walk(c); return; }
        if (c.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var word = document.createElement('span'); word.style.whiteSpace = 'nowrap';
          w.split('').forEach(function (ch) {
            var s = document.createElement('span'); s.className = 'c'; s.textContent = ch; s.style.setProperty('--i', i++);
            s.style.transform = 'translateY(' + (rnd() * .07).toFixed(3) + 'em) rotate(' + (rnd() * 2.4).toFixed(2) + 'deg)';
            word.appendChild(s);
          });
          frag.appendChild(word);
        });
        c.parentNode.replaceChild(frag, c);
      });
    })(el);
    if (el.getAttribute('aria-hidden') !== 'true') {
      var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
      while (el.firstChild) vis.appendChild(el.firstChild);
      var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
      el.appendChild(sr); el.appendChild(vis);
    }
  }
  function quad(el) {
    var p = PORTRAIT.matches && el.dataset.quadP && el.closest('.has-p');
    return { key: p ? 'p' : 'l', iw: p ? 1024 : 1536, ih: p ? 1536 : 1024,
      pts: (p ? el.dataset.quadP : el.dataset.quad).trim().split(/\s+/).map(function (s) { return s.split(',').map(Number); }) };
  }
  function d(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function layout(el) {
    var plate = el.closest('.plate'), W = plate.clientWidth, H = plate.clientHeight;
    if (!W || !H) return;
    var q = quad(el);
    if (el._key !== q.key) {   // 종이(가로판/세로판)가 바뀔 때만 상자 크기·글자 크기를 다시 맞춘다
      el._key = q.key;
      var P = q.pts.map(function (v) { return [v[0] / 100 * q.iw, v[1] / 100 * q.ih]; });
      var bh = Math.round(BOX * (d(P[0], P[3]) + d(P[1], P[2])) / (d(P[0], P[1]) + d(P[3], P[2])));
      var pad = ((q.key === 'p' && el.dataset.padP) || el.dataset.pad || '12 12 12 12').split(/\s+/).map(Number);
      el.style.width = BOX + 'px'; el.style.height = bh + 'px';
      el.style.padding = [pad[0] / 100 * bh, pad[1] / 100 * BOX, pad[2] / 100 * bh, pad[3] / 100 * BOX].map(function (v) { return v.toFixed(1) + 'px'; }).join(' ');
      if (!el.classList.contains('ov')) { el._key = q.key; } else {
      var fs = +(el.dataset.fs || 34); el.style.fontSize = fs + 'px';
      while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && fs > 10) { fs -= 1; el.style.fontSize = fs + 'px'; }
      }
    }
    el.style.transform = homography(BOX, parseFloat(el.style.height), q.pts.map(function (v) { return [v[0] / 100 * W, v[1] / 100 * H]; }));
  }
  function layoutAll() { els.forEach(layout); }
  var fontsIn = document.fonts ? Promise.all([document.fonts.load('400 30px "Nanum Pen Script"', '가나다'), document.fonts.load('600 30px "Noto Serif KR"', '가나다')]) : Promise.resolve();
  var wait = new Promise(function (r) { setTimeout(r, 3000); });   // 서체를 못 받아도 3초 뒤에는 대체 서체로 그린다
  return Promise.race([fontsIn, wait]).catch(function () {}).then(function () {
    texts.forEach(handwrite);
    layoutAll();
    document.documentElement.classList.add('ov-ready');
    var queued = false;
    function relayout() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; layoutAll(); }); } }
    addEventListener('resize', relayout);
    if (PORTRAIT.addEventListener) PORTRAIT.addEventListener('change', relayout);
    if (document.fonts) document.fonts.addEventListener('loadingdone', function () { els.forEach(function (el) { el._key = null; }); relayout(); });
  });
})();

// ── 하루 시간 단추 ──
// 첫 화면을 지나면 아래에 떠오르고, 화면 가운데를 지난 마지막 장면의 시각에 불이 들어온다. 맨 아래(footer)에서는 숨는다.
// (움직임 줄이기 설정에서도 길잡이로 쓰인다)
(function () {
  var bar = document.querySelector('.timebar');
  var links = [].slice.call(bar.querySelectorAll('a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var hero = document.querySelector('.hero'), foot = document.querySelector('footer'), night = document.getElementById('s5');
  onScroll(function () {
    var vh = innerHeight, cur = -1;
    targets.forEach(function (t, i) { if (t.getBoundingClientRect().top <= vh * .5) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    bar.classList.toggle('show', hero.getBoundingClientRect().bottom < vh * .55 && foot.getBoundingClientRect().top > vh - 40);
    bar.classList.toggle('dark', night.getBoundingClientRect().top < vh * .5);
  });
})();

// ════ 아래는 움직임. <head>의 짧은 스크립트가 '움직임 줄이기'가 아닐 때만 <html>에 .motion을 붙인다 ════
var MOTION = document.documentElement.classList.contains('motion');

// ── 글자 나누기: [data-reveal](제목이 흐림→선명) ──
// 화면 읽기 프로그램에는 원래 문장을 통째로 들려주고(.sr-only), 나눈 글자들은 숨긴다(aria-hidden).
// 줄바꿈·안쪽 꾸밈(<br>·<span>)은 그대로 두고 글자만 감싼다.
function splitChars(el) {
  var i = 0, full = el.textContent.replace(/\s+/g, ' ').trim();
  (function walk(node) {
    [].slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var frag = document.createDocumentFragment();
        c.textContent.split('').forEach(function (ch) {
          if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
          var s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++); frag.appendChild(s);
        });
        c.parentNode.replaceChild(frag, c);
      } else if (c.nodeType === 1) walk(c);
    });
  })(el);
  var visible = document.createElement('span'); visible.setAttribute('aria-hidden', 'true');
  while (el.firstChild) visible.appendChild(el.firstChild);
  var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
  el.appendChild(sr); el.appendChild(visible);
}
if (MOTION) {
  document.querySelectorAll('[data-reveal]').forEach(splitChars);
  // 화면에 들어오면 한 번만 .in (다시 나가도 되돌리지 않음)
  var seen = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } });
  }, { threshold: .18 });
  document.querySelectorAll('[data-reveal], [data-enter]').forEach(function (el) { seen.observe(el); });
  document.querySelector('footer').classList.add('is-night');
  // 첫 화면 종이 위 문장은 손글씨가 종이에 붙은 뒤 한 글자씩 써 내려간다
  inkReady.then(function () { requestAnimationFrame(function () { document.querySelectorAll('[data-ink]').forEach(function (el) { el.classList.add('in'); }); }); });
}

// ── 장면 묶음(.seq): 화면에 붙잡힌 채 같은 자리에서 그림을 차례로 겹쳐 바꾼다 ──
// 묶음 안 그림이 n장이면 진행 t는 0 → n-1. 그림 i는 t가 i-0.75 → i-0.25일 때 덮여 오고(--in),
// 글은 다음 그림이 오기 전에 먼저 사라지고(i+0.15→0.4), 새 그림의 글은 그 뒤에 나타난다(i+0.55→0.85)(--a). 가장 또렷한 그림만 누를 수 있다(data-active).
if (MOTION) (function () {
  var seqs = [].slice.call(document.querySelectorAll('.seq')).map(function (el) {
    var frames = [].slice.call(el.querySelectorAll(':scope > .seq-stick > .frame'));
    el.style.setProperty('--n', frames.length);
    return { el: el, frames: frames, last: [] };
  });
  function set(f, k, v, cache, idx) {   // 값이 바뀔 때만 써서 불필요한 다시 그리기를 줄인다
    var key = idx + k; v = Math.round(v * 1000) / 1000;
    if (cache[key] !== v) { cache[key] = v; f.style.setProperty(k, v); }
  }
  onScroll(function () {
    var vh = innerHeight;
    seqs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;   // 멀리 있는 묶음은 계산하지 않음
      var n = s.frames.length, p = clamp01(-r.top / Math.max(1, r.height - vh)), t = p * (n - 1), best = 0, bestA = -1;
      s.frames.forEach(function (f, i) {
        var inn = i === 0 ? 1 : ease((t - (i - 1) - .25) / .5);
        var txtIn = i === 0 ? 1 : ease((t - (i - 1) - .55) / .3);   // 앞 글이 다 사라진 뒤에 나타나도록
        var out = i === n - 1 ? 0 : ease((t - i - .15) / .25);
        var a = txtIn * (1 - out);
        set(f, '--in', inn, s.last, i); set(f, '--a', a, s.last, i); set(f, '--p', p, s.last, i);
        if (a > bestA) { bestA = a; best = i; }
      });
      s.frames.forEach(function (f, i) { if (i === best) f.setAttribute('data-active', ''); else f.removeAttribute('data-active'); });
    });
  });
})();

// ── 밤이 내려앉는다: 장면 5(21:00)의 윗변이 화면 아래 85% → 25% 자리로 올라오는 동안 화면 전체가 남색으로 ──
if (MOTION) (function () {
  var veil = document.querySelector('.nightfall'), night = document.getElementById('s5');
  onScroll(function () {
    var o = ease((innerHeight * .85 - night.getBoundingClientRect().top) / (innerHeight * .6));
    veil.style.setProperty('--night-o', Math.round(o * 1000) / 1000);
  });
})();

// ── 부드러운 휠(레퍼런스의 Lenis와 같은 일을 하는 짧은 코드) ──
// 마우스 휠의 툭툭 끊기는 스크롤을 미끄러지듯 이어 준다. 손가락으로 미는 기기는 원래 부드러우므로 손대지 않는다.
// 사용법 창이 열려 있거나, 안쪽에서 따로 스크롤되는 상자 위에서는 브라우저에 맡긴다.
// 페이지 안 이동 링크(#…)도 같은 방식으로 미끄러지게 한다. 키보드·스크롤바로 움직이면 그 자리를 따라잡는다.
if (MOTION) (function () {
  var target = scrollY, cur = scrollY, running = false;
  function maxY() { return document.documentElement.scrollHeight - innerHeight; }
  function glide(y) {
    if (!running) { target = cur = scrollY; }
    target = Math.max(0, Math.min(maxY(), y));
    if (!running) { running = true; requestAnimationFrame(step); }
  }
  function step() {
    cur += (target - cur) * .11;
    if (Math.abs(target - cur) < .5) cur = target;
    window.scrollTo(0, cur);
    if (cur !== target) requestAnimationFrame(step); else running = false;
  }
  function scrollsInside(el, dy) {
    for (; el && el !== document.body; el = el.parentElement) {
      var s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1 &&
          (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight)) return true;
    }
    return false;
  }
  addEventListener('scroll', function () { if (!running) { target = cur = scrollY; } }, { passive: true });
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector('dialog[open]') || scrollsInside(e.target, e.deltaY)) return;
      e.preventDefault();
      glide((running ? target : scrollY) + e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1));
    }, { passive: false });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('open-guide')) return;
    var id = a.getAttribute('href'), el = id === '#top' ? null : document.querySelector(id);
    if (id !== '#top' && !el) return;
    e.preventDefault();
    var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    glide(el ? el.getBoundingClientRect().top + scrollY - pad : 0);
    history.replaceState(null, '', id);
  });
})();
