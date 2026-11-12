/* Basics - math facts practice. ES5 only. */
(function (root) {
  'use strict';

  /* ---------- Levels (add more here later) ---------- */
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  var LEVELS = [
    {
      id: 1,
      name: 'Level 1 - Multiply & divide 1-12',
      generate: function () {
        var a = randInt(1, 12), b = randInt(1, 12);
        if (Math.random() < 0.5) {
          return { text: a + ' \u00d7 ' + b, answer: a * b, key: a + 'x' + b };
        }
        var p = a * b;
        return { text: p + ' \u00f7 ' + a, answer: b, key: p + '/' + a };
      }
    }
  ];

  function getLevel(id) {
    for (var i = 0; i < LEVELS.length; i++) { if (LEVELS[i].id === id) { return LEVELS[i]; } }
    return LEVELS[0];
  }

  /* Build a question list with no immediate repeats */
  function buildQuestions(levelId, n) {
    var level = getLevel(levelId), list = [], last = null, q, tries;
    for (var i = 0; i < n; i++) {
      tries = 0;
      do { q = level.generate(); tries++; } while (last && q.key === last && tries < 50);
      list.push(q);
      last = q.key;
    }
    return list;
  }

  var api = { LEVELS: LEVELS, getLevel: getLevel, buildQuestions: buildQuestions };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.Basics = api;

  /* ---------- App (browser only) ---------- */
  var HIST_KEY = 'basics.history.v1', NAME_KEY = 'basics.name', LEVEL_KEY = 'basics.level', COUNT_KEY = 'basics.count';
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }

  function store(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function getHistory() {
    try { var h = JSON.parse(load(HIST_KEY) || '[]'); return h && h.length !== undefined ? h : []; } catch (e) { return []; }
  }

  var S = null;          // current session
  var tickTimer = null, advTimer = null;

  function show(id) {
    var s = doc.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) { s[i].className = 'screen' + (s[i].id === id ? ' active' : ''); }
    root.scrollTo(0, 0);
  }

  function fmtTime(ms) {
    var t = Math.floor(ms / 1000), m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function clearTimers() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (advTimer) { clearTimeout(advTimer); advTimer = null; }
  }

  function start() {
    clearTimers();
    var name = ($('name').value || '').replace(/^\s+|\s+$/g, '') || 'Cole';
    var levelId = parseInt($('level').value, 10) || 1;
    var count = parseInt($('count').value, 10) || 50;
    store(NAME_KEY, name); store(LEVEL_KEY, String(levelId)); store(COUNT_KEY, String(count));
    S = {
      name: name, levelId: levelId, count: count,
      questions: buildQuestions(levelId, count),
      idx: 0, tries: 0, entry: '', locked: false,
      first: 0, second: 0, missed: [],
      startedAt: new Date(), startMs: Date.now()
    };
    show('quiz');
    tickTimer = setInterval(updateTimer, 250);
    renderQuestion();
  }

  function updateTimer() { if (S) { $('timer').innerHTML = fmtTime(Date.now() - S.startMs); } }

  function renderQuestion() {
    var q = S.questions[S.idx];
    S.tries = 0; S.entry = ''; S.locked = false;
    $('progress').innerHTML = (S.idx + 1) + '/' + S.count;
    $('barFill').style.width = (S.idx / S.count * 100) + '%';
    $('qText').innerHTML = q.text + ' =';
    setFb('', '');
    renderEntry();
    updateTimer();
  }

  function renderEntry() { $('aText').innerHTML = S.entry ? esc(S.entry) : '&nbsp;'; }
  function setFb(cls, txt) { var f = $('fb'); f.className = 'feedback' + (cls ? ' ' + cls : ''); f.innerHTML = txt; }

  function press(k) {
    if (!S || S.locked) { return; }
    if (k === 'back') { S.entry = S.entry.slice(0, -1); renderEntry(); return; }
    if (k === 'go') { submit(); return; }
    if (/^[0-9]$/.test(k) && S.entry.length < 4) {
      if (S.entry === '0') { S.entry = ''; }
      S.entry += k; renderEntry();
      if (S.tries > 0) { setFb('', ''); }
    }
  }

  function submit() {
    if (!S.entry) { return; }
    var q = S.questions[S.idx], val = parseInt(S.entry, 10);
    if (val === q.answer) {
      if (S.tries === 0) { S.first++; setFb('good', 'Correct!'); } else { S.second++; setFb('good', 'Got it!'); }
      S.locked = true;
      advTimer = setTimeout(next, 450);
      return;
    }
    S.tries++;
    if (S.tries === 1) {
      setFb('bad', 'Try again');
      S.entry = ''; renderEntry();
    } else {
      S.missed.push({ q: q.text, a: q.answer, given: S.entry });
      S.locked = true;
      setFb('show', q.text + ' = ' + q.answer);
      S.entry = String(q.answer); renderEntry();
      advTimer = setTimeout(next, 2000);
    }
  }

  function next() {
    advTimer = null;
    if (!S) { return; }
    S.idx++;
    if (S.idx >= S.count) { finish(); } else { renderQuestion(); }
  }

  function finish() {
    clearTimers();
    var ms = Date.now() - S.startMs;
    var rec = {
      id: S.startMs + '-' + Math.floor(Math.random() * 1e6),
      name: S.name, level: S.levelId, levelName: getLevel(S.levelId).name,
      questions: S.count, started: S.startedAt.toISOString(), finished: new Date().toISOString(),
      timeMs: ms, firstTry: S.first, secondTry: S.second, missedCount: S.missed.length,
      accuracy: Math.round(S.first / S.count * 100),
      avgSec: Math.round(ms / S.count / 100) / 10,
      missed: S.missed
    };
    var h = getHistory(); h.push(rec);
    store(HIST_KEY, JSON.stringify(h));
    renderResults(rec);
    S = null;
    show('results');
  }

  function renderResults(r) {
    $('statsBox').innerHTML =
      '<div><span>Name</span><b>' + esc(r.name) + '</b></div>' +
      '<div><span>Total time</span><b>' + fmtTime(r.timeMs) + '</b></div>' +
      '<div><span>Right first try</span><b>' + r.firstTry + ' / ' + r.questions + '</b></div>' +
      '<div><span>Right second try</span><b>' + r.secondTry + '</b></div>' +
      '<div><span>Missed</span><b>' + r.missedCount + '</b></div>' +
      '<div><span>Accuracy (first try)</span><b>' + r.accuracy + '%</b></div>' +
      '<div><span>Average per question</span><b>' + r.avgSec + ' s</b></div>';
    var m = r.missed.length ? '<b>Missed facts:</b><br>' : '<b>No missed facts. Great job!</b>';
    for (var i = 0; i < r.missed.length; i++) { m += '<span>' + esc(r.missed[i].q) + ' = ' + r.missed[i].a + '</span>'; }
    $('missedBox').innerHTML = m;
  }

  function renderHistory() {
    var h = getHistory().slice().reverse(), out = '';
    if (!h.length) { out = '<p class="small">No sessions yet.</p>'; }
    for (var i = 0; i < h.length; i++) {
      var r = h[i], miss = [];
      for (var j = 0; j < r.missed.length; j++) { miss.push(r.missed[j].q + ' = ' + r.missed[j].a); }
      out += '<div class="hist"><b>' + esc(r.name) + '</b> &middot; ' + esc(fmtDate(r.started)) + '<br>' +
        'Level ' + r.level + ' &middot; ' + r.questions + ' questions &middot; ' + fmtTime(r.timeMs) + '<br>' +
        'First try ' + r.firstTry + ' &middot; Second ' + r.secondTry + ' &middot; Missed ' + r.missedCount +
        ' &middot; ' + r.accuracy + '% &middot; ' + r.avgSec + ' s/q' +
        (miss.length ? '<br>Missed: ' + esc(miss.join(', ')) : '') + '</div>';
    }
    $('histList').innerHTML = out;
    show('history');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function localStamp(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function csvCell(v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv() {
    var h = getHistory();
    var rows = [['Name', 'Level', 'Started', 'Finished', 'Questions', 'Time (sec)', 'First try', 'Second try', 'Missed', 'Accuracy %', 'Avg sec/question', 'Missed facts']];
    for (var i = 0; i < h.length; i++) {
      var r = h[i], miss = [];
      for (var j = 0; j < r.missed.length; j++) { miss.push(r.missed[j].q + ' = ' + r.missed[j].a); }
      rows.push([r.name, r.level, localStamp(r.started), localStamp(r.finished), r.questions, Math.round(r.timeMs / 1000), r.firstTry, r.secondTry, r.missedCount, r.accuracy, r.avgSec, miss.join('; ')]);
    }
    var lines = [];
    for (var k = 0; k < rows.length; k++) {
      var c = [];
      for (var x = 0; x < rows[k].length; x++) { c.push(csvCell(rows[k][x])); }
      lines.push(c.join(','));
    }
    var csv = lines.join('\n') + '\n';
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'basics-history-' + new Date().toISOString().slice(0, 10) + '.csv';
    doc.body.appendChild(a); a.click();
    setTimeout(function () { doc.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
  }

  function quit() {
    if (root.confirm && !root.confirm('Quit this practice? It will not be saved.')) { return; }
    clearTimers(); S = null; show('home');
  }

  function init() {
    var sel = $('level');
    for (var i = 0; i < LEVELS.length; i++) {
      var o = doc.createElement('option'); o.value = LEVELS[i].id; o.innerHTML = esc(LEVELS[i].name); sel.appendChild(o);
    }
    if (load(NAME_KEY)) { $('name').value = load(NAME_KEY); }
    if (load(LEVEL_KEY)) { sel.value = load(LEVEL_KEY); }
    if (load(COUNT_KEY)) { $('count').value = load(COUNT_KEY); }

    $('startBtn').onclick = start;
    $('againBtn').onclick = start;
    $('homeBtn').onclick = function () { show('home'); };
    $('historyBtn').onclick = renderHistory;
    $('histHomeBtn').onclick = function () { show('home'); };
    $('csvBtn').onclick = exportCsv;
    $('quitBtn').onclick = quit;

    var keys = doc.querySelectorAll('.key');
    for (var j = 0; j < keys.length; j++) {
      (function (btn) {
        var k = btn.getAttribute('data-k'), touched = false;
        btn.addEventListener('touchstart', function (e) {
          e.preventDefault(); touched = true; btn.className += ' pressed'; press(k);
        }, { passive: false });
        btn.addEventListener('touchend', function () { btn.className = btn.className.replace(' pressed', ''); });
        btn.addEventListener('click', function () { if (touched) { touched = false; return; } press(k); });
      })(keys[j]);
    }

    doc.addEventListener('keydown', function (e) {
      if (!S) { return; }
      var k = e.key;
      if (/^[0-9]$/.test(k)) { press(k); e.preventDefault(); }
      else if (k === 'Enter') { press('go'); e.preventDefault(); }
      else if (k === 'Backspace') { press('back'); e.preventDefault(); }
    });
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})(this);
