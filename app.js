(() => {
  'use strict';

  const DEFAULT_LANG = 'ja';
  const STORE_LANG = 'menu.lang';
  const STORE_FILTER = 'menu.filter';

  let I18N = null;
  let MENU = null;
  const state = {
    lang: DEFAULT_LANG,
    selected: new Set(),
    mode: 'hide',
    includeMay: true,
  };

  const $ = (id) => document.getElementById(id);

  // Create an element safely (text is never parsed as HTML).
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) {
      if (c === null || c === undefined) continue;
      node.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  // Translate a {ja, en, ...} object, falling back to Japanese.
  function tr(obj) {
    if (!obj) return '';
    return obj[state.lang] || obj[DEFAULT_LANG] || '';
  }
  const ui = (key, vars) => {
    let s = tr(I18N.ui[key]);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };

  function supported(code) {
    return I18N.languages.some((l) => l.code === code);
  }

  function matchBrowserLang() {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const raw of prefs) {
      const p = raw.toLowerCase();
      if (p.startsWith('zh')) {
        if (p.includes('hant') || p.endsWith('-tw') || p.endsWith('-hk') || p.endsWith('-mo')) return 'zh-Hant';
        return 'zh-Hans';
      }
      const base = p.split('-')[0];
      const hit = I18N.languages.find((l) => l.code.toLowerCase() === base);
      if (hit) return hit.code;
    }
    return null;
  }

  function initialLang() {
    const param = new URLSearchParams(location.search).get('lang');
    if (param && supported(param)) return param;
    let saved = null;
    try { saved = localStorage.getItem(STORE_LANG); } catch (_) { /* storage unavailable */ }
    if (saved && supported(saved)) return saved;
    return matchBrowserLang() || DEFAULT_LANG;
  }

  function loadFilter() {
    try {
      const f = JSON.parse(localStorage.getItem(STORE_FILTER) || 'null');
      if (!f) return;
      state.selected = new Set((f.selected || []).filter((k) => k in I18N.allergens));
      state.mode = f.mode === 'warn' ? 'warn' : 'hide';
      state.includeMay = f.includeMay !== false;
    } catch (_) { /* ignore */ }
  }
  function saveFilter() {
    try {
      localStorage.setItem(STORE_FILTER, JSON.stringify({
        selected: [...state.selected], mode: state.mode, includeMay: state.includeMay,
      }));
    } catch (_) { /* ignore */ }
  }

  function setLang(code, focusButton) {
    state.lang = code;
    document.documentElement.lang = code;
    try { localStorage.setItem(STORE_LANG, code); } catch (_) { /* ignore */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', code);
    history.replaceState(null, '', url);
    renderAll();
    if (focusButton) {
      const btn = document.querySelector(`#lang-switch button[data-lang="${code}"]`);
      if (btn) btn.focus();
    }
  }

  // ---------- rendering ----------

  function renderLangSwitch() {
    const box = $('lang-switch');
    box.setAttribute('aria-label', ui('language'));
    box.replaceChildren(...I18N.languages.map((l) => {
      const b = el('button', {
        type: 'button',
        'data-lang': l.code,
        lang: l.code,
        'aria-pressed': String(l.code === state.lang),
        text: l.label,
      });
      b.addEventListener('click', () => setLang(l.code, true));
      return b;
    }));
  }

  function renderStaticText() {
    document.title = `${ui('storeName')} | ${ui('subtitle')}`;
    $('store-name').textContent = ui('storeName');
    $('subtitle').textContent = ui('subtitle');
    $('filter-title').textContent = ui('filterTitle');
    $('filter-help').textContent = ui('filterHelp');
    $('mandatory-label').textContent = ui('mandatoryLabel');
    $('recommended-label').textContent = ui('recommendedLabel');
    $('mode-label').textContent = ui('modeLabel');
    $('mode-hide').textContent = ui('modeHide');
    $('mode-warn').textContent = ui('modeWarn');
    $('include-may-label').textContent = ui('includeMay');
    $('clear-btn').textContent = ui('clear');
    $('disclaimer').textContent = ui('disclaimer');
    $('sample-note').textContent = ui('sampleNote');
  }

  function renderFilterChecks() {
    const make = (mandatory) => Object.entries(I18N.allergens)
      .filter(([, a]) => a.mandatory === mandatory)
      .map(([key, a]) => {
        const input = el('input', { type: 'checkbox', value: key, checked: state.selected.has(key) });
        input.addEventListener('change', () => {
          if (input.checked) state.selected.add(key); else state.selected.delete(key);
          saveFilter();
          renderMenu();
          updateSelectedCount();
        });
        return el('label', { class: 'check' + (mandatory ? ' is-mandatory' : '') }, [
          input,
          el('span', { class: 'icon', 'aria-hidden': 'true', text: a.icon }),
          el('span', { text: tr(a.name) }),
        ]);
      });
    $('mandatory-list').replaceChildren(...make(true));
    $('recommended-list').replaceChildren(...make(false));

    document.querySelectorAll('input[name="mode"]').forEach((r) => { r.checked = r.value === state.mode; });
    $('include-may').checked = state.includeMay;
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const n = state.selected.size;
    $('selected-count').textContent = n ? ui('selectedCount', { n }) : '';
  }

  function renderCatNav() {
    $('cat-nav').replaceChildren(...MENU.categories.map((c) =>
      el('a', { href: `#cat-${c}`, text: tr(I18N.categories[c]) })));
  }

  function evaluate(item) {
    const hitContains = item.allergens.filter((a) => state.selected.has(a));
    const hitMay = state.includeMay ? (item.may_contain || []).filter((a) => state.selected.has(a)) : [];
    return { hitContains, hitMay, matched: hitContains.length + hitMay.length > 0 };
  }

  function allergenChip(key, kind, hit) {
    const a = I18N.allergens[key];
    if (!a) return null;
    const cls = ['chip', kind === 'may' ? 'chip-may' : '', a.mandatory ? 'chip-mandatory' : '', hit ? 'chip-hit' : '']
      .filter(Boolean).join(' ');
    return el('li', { class: cls }, [
      hit ? el('span', { class: 'hit-mark', 'aria-hidden': 'true', text: '⚠' }) : null,
      el('span', { class: 'icon', 'aria-hidden': 'true', text: a.icon }),
      el('span', { text: tr(a.name) }),
    ]);
  }

  function renderCard(item, ev) {
    const warn = state.mode === 'warn' && ev.matched;
    const card = el('article', { class: 'card' + (warn ? ' card-warn' : ''), 'aria-labelledby': `item-${item.id}` });

    const head = el('div', { class: 'card-head' }, [
      el('h3', { id: `item-${item.id}`, text: tr(item.name) }),
      el('p', { class: 'price' }, [
        `¥${item.price.toLocaleString('ja-JP')}`,
        el('span', { class: 'tax', text: ` (${ui('taxIncluded')})` }),
      ]),
    ]);
    card.append(head);

    if (warn) {
      const msg = ev.hitContains.length ? ui('warnContains') : ui('warnMay');
      card.append(el('p', { class: 'warn-banner', role: 'note' }, [
        el('span', { 'aria-hidden': 'true', text: '⚠ ' }), msg,
      ]));
    }

    card.append(el('p', { class: 'desc', text: tr(item.desc) }));

    // tags (vegetarian, vegan, halal) + spiciness
    const tagNodes = (item.tags || []).filter((t) => I18N.tags[t]).map((t) =>
      el('li', { class: 'tag' }, [
        el('span', { 'aria-hidden': 'true', text: I18N.tags[t].icon + ' ' }), tr(I18N.tags[t].name),
      ]));
    if (item.spicy > 0) {
      tagNodes.push(el('li', { class: 'tag tag-spicy' }, [
        `${ui('spicy')} `,
        el('span', { 'aria-hidden': 'true', text: '🌶'.repeat(item.spicy) }),
        el('span', { class: 'sr-only', text: `${item.spicy}/3` }),
      ]));
    }
    if (tagNodes.length) card.append(el('ul', { class: 'tags' }, tagNodes));

    // allergens
    const allergenBox = el('div', { class: 'allergens' });
    if (item.allergens.length) {
      allergenBox.append(
        el('p', { class: 'allergen-label', text: ui('contains') }),
        el('ul', { class: 'chips' }, item.allergens.map((k) => allergenChip(k, 'contains', ev.hitContains.includes(k)))),
      );
    } else {
      allergenBox.append(el('p', { class: 'allergen-none', text: ui('noAllergens') }));
    }
    if (item.may_contain && item.may_contain.length) {
      allergenBox.append(
        el('p', { class: 'allergen-label', title: ui('mayContainHelp') }, [
          ui('mayContain'),
          el('span', { class: 'allergen-help', text: ` — ${ui('mayContainHelp')}` }),
        ]),
        el('ul', { class: 'chips' }, item.may_contain.map((k) => allergenChip(k, 'may', ev.hitMay.includes(k)))),
      );
    }
    card.append(allergenBox);
    return card;
  }

  function renderMenu() {
    let hidden = 0;
    const sections = MENU.categories.map((cat) => {
      const items = MENU.items.filter((i) => i.category === cat);
      const cards = [];
      for (const item of items) {
        const ev = evaluate(item);
        if (state.mode === 'hide' && ev.matched) { hidden++; continue; }
        cards.push(renderCard(item, ev));
      }
      return el('section', { class: 'category', id: `cat-${cat}`, 'aria-labelledby': `h-${cat}` }, [
        el('h2', { id: `h-${cat}`, text: tr(I18N.categories[cat]) }),
        cards.length ? el('div', { class: 'cards' }, cards) : el('p', { class: 'empty', text: ui('noResults') }),
      ]);
    });
    $('menu').replaceChildren(...sections);
    $('status').textContent = hidden ? ui('hiddenCount', { n: hidden }) : '';
  }

  function renderAll() {
    renderLangSwitch();
    renderStaticText();
    renderFilterChecks();
    renderCatNav();
    renderMenu();
  }

  function bindControls() {
    document.querySelectorAll('input[name="mode"]').forEach((r) => {
      r.addEventListener('change', () => { state.mode = r.value; saveFilter(); renderMenu(); });
    });
    $('include-may').addEventListener('change', (e) => {
      state.includeMay = e.target.checked; saveFilter(); renderMenu();
    });
    $('clear-btn').addEventListener('click', () => {
      state.selected.clear(); saveFilter(); renderFilterChecks(); renderMenu();
    });
  }

  async function init() {
    try {
      const [i18n, menu] = await Promise.all([
        fetch('data/i18n.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('data/menu.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      ]);
      I18N = i18n;
      MENU = menu;
    } catch (err) {
      console.error(err);
      $('menu').replaceChildren(el('p', { class: 'empty', text: 'メニューを読み込めませんでした。/ Could not load the menu.' }));
      return;
    }
    loadFilter();
    bindControls();
    if (state.selected.size) $('filter').open = true;
    setLang(initialLang(), false);
  }

  init();
})();
