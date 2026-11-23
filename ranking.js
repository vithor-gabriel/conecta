/* CONECTA - Ranking (arquivo independente)
   Lê o nome e o XP salvos pelo jogo, envia para o Supabase e mostra o ranking
   num botão flutuante. Não mexe no código do jogo. */
(function () {
  'use strict';

  /* ====== COLE AQUI OS DADOS DO SUPABASE ====== */
  var SB_URL = 'https://hsozyyplqiriwzxjwgwf.supabase.co';   // ex: https://abcd1234.supabase.co
  var SB_KEY = 'sb_publishable_QZ9PtHxZMBxmNNQhd9eR9A_i3RxuYG0'; // chave anon public / publishable
  /* ============================================ */

  var STORE = 'conecta.v1';
  var PIDKEY = 'conecta.rank.pid';
  var NIVEIS = [0, 50, 120, 220, 350, 500, 660, 800, 900, 1000];
  var PID = null;
  var ultimo = null;

  function configurado() { return SB_URL.indexOf('http') === 0 && SB_KEY.length > 20; }
  function cab(extra) {
    var h = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }
  function pid() {
    if (PID) return PID;
    try { PID = localStorage.getItem(PIDKEY); } catch (e) {}
    if (!PID) {
      PID = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(PIDKEY, PID); } catch (e) {}
    }
    return PID;
  }
  function lerJogo() {
    try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; }
  }
  function nivel(xp) {
    var n = 1;
    for (var i = 0; i < NIVEIS.length; i++) { if (xp >= NIVEIS[i]) n = i + 1; }
    return n;
  }

  /* ---- envio da pontuação ---- */
  function sync() {
    if (!configurado()) return Promise.resolve();
    var s = lerJogo();
    if (!s || typeof s !== 'object') return Promise.resolve();
    var nome = (typeof s.name === 'string' && s.name.trim()) ? s.name.trim().slice(0, 20) : 'Anônimo';
    var xp = Math.floor(Number(s.xp) || 0);
    var chave = nome + '|' + xp;
    if (chave === ultimo) return Promise.resolve();
    if (xp <= 0 && ultimo === null) return Promise.resolve();
    ultimo = chave;
    return fetch(SB_URL + '/rest/v1/ranking?on_conflict=id', {
      method: 'POST',
      headers: cab({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: pid(), name: nome, xp: xp, updated_at: new Date().toISOString() })
    }).then(function (r) { if (!r.ok) ultimo = 'falhou'; })
      .catch(function () { ultimo = 'falhou'; });
  }

  /* ---- visual ---- */
  var css =
    '#rk-fab{position:fixed;right:16px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:50;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;font-size:24px;line-height:1;background:linear-gradient(135deg,#8B5CF6,#22D3EE);box-shadow:0 8px 22px rgba(0,0,0,.45)}' +
    '@media(min-width:860px){#rk-fab{bottom:24px;right:24px}}' +
    '.rk-bg{position:fixed;inset:0;z-index:90;background:rgba(3,6,24,.78);display:grid;place-items:center;padding:16px}' +
    '.rk-box{width:100%;max-width:420px;max-height:85vh;overflow:auto;background:var(--surface,#131B46);color:var(--fg,#EEF1FF);border:1px solid var(--line,rgba(157,176,255,.18));border-radius:24px;padding:18px;font-family:var(--body,system-ui,sans-serif)}' +
    '.rk-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}' +
    '.rk-top h2{margin:0;font-family:var(--display,system-ui,sans-serif);font-size:24px}' +
    '.rk-btn{min-height:44px;padding:0 16px;border-radius:14px;border:1px solid var(--line,rgba(157,176,255,.18));background:var(--surface-2,#1B2560);color:inherit;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}' +
    '.rk-lista{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}' +
    '.rk-row{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;background:var(--bg-2,#0F1740);font-size:16px}' +
    '.rk-row span{min-width:0;overflow-wrap:anywhere}' +
    '.rk-row small{color:var(--muted,#A3AEDD)}' +
    '.rk-row b{white-space:nowrap}' +
    '.rk-row.top b{color:var(--warn,#FBBF24)}' +
    '.rk-row.eu{box-shadow:0 0 0 1px rgba(34,211,238,.6) inset;background:rgba(34,211,238,.14)}' +
    '.rk-msg{color:var(--muted,#A3AEDD);padding:8px 2px}';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  var fundo = null;
  function fechar() {
    if (fundo && fundo.parentNode) fundo.parentNode.removeChild(fundo);
    fundo = null;
  }

  function carregar(lista) {
    lista.innerHTML = '';
    lista.appendChild(el('p', 'rk-msg', 'Carregando…'));
    if (!configurado()) {
      lista.innerHTML = '';
      lista.appendChild(el('p', 'rk-msg', 'O ranking ainda não foi configurado.'));
      return;
    }
    sync().then(function () {
      return fetch(SB_URL + '/rest/v1/ranking?select=id,name,xp&order=xp.desc&limit=30', { headers: cab() });
    }).then(function (r) {
      if (!r.ok) throw new Error('http');
      return r.json();
    }).then(function (dados) {
      lista.innerHTML = '';
      if (!dados.length) { lista.appendChild(el('p', 'rk-msg', 'Ninguém jogou ainda. Seja o primeiro!')); return; }
      dados.forEach(function (p, i) {
        var eu = p.id === pid();
        var linha = el('div', 'rk-row' + (i < 3 ? ' top' : '') + (eu ? ' eu' : ''));
        var esq = el('span', null, (i + 1) + 'º · ' + p.name + (eu ? ' (você)' : '') + ' ');
        esq.appendChild(el('small', null, 'Nv ' + nivel(p.xp)));
        linha.appendChild(esq);
        linha.appendChild(el('b', null, p.xp + ' XP'));
        lista.appendChild(linha);
      });
    }).catch(function () {
      lista.innerHTML = '';
      lista.appendChild(el('p', 'rk-msg', 'Não consegui carregar o ranking. Confira a internet e tente de novo.'));
    });
  }

  function abrir() {
    fechar();
    fundo = el('div', 'rk-bg');
    var caixa = el('div', 'rk-box');
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-label', 'Ranking');
    var topo = el('div', 'rk-top');
    topo.appendChild(el('h2', null, 'Ranking'));
    var x = el('button', 'rk-btn', 'Fechar');
    x.addEventListener('click', fechar);
    topo.appendChild(x);
    var lista = el('div', 'rk-lista');
    var atualizar = el('button', 'rk-btn', 'Atualizar');
    atualizar.style.width = '100%';
    atualizar.addEventListener('click', function () { carregar(lista); });
    caixa.appendChild(topo);
    caixa.appendChild(lista);
    caixa.appendChild(atualizar);
    fundo.appendChild(caixa);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    document.body.appendChild(fundo);
    carregar(lista);
  }

  function iniciar() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var b = el('button', null, '🏆');
    b.id = 'rk-fab';
    b.setAttribute('aria-label', 'Abrir ranking');
    b.title = 'Ranking';
    b.addEventListener('click', abrir);
    document.body.appendChild(b);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    sync();
    setInterval(sync, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
