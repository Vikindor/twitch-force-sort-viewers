// ==UserScript==
// @name         Twitch - Force sort Viewers High to Low
// @namespace    https://twitch.tv/
// @version      1.5
// @description  Auto-set sort to "opt1" (Viewers High->Low) with configurable run policy
// @author       Vikindor
// @license      MIT
// @match        https://www.twitch.tv/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- CONFIG ----------------
  // RUN_POLICY options:
  //  - 'perTab'  : run once per URL per tab session (F5 won't run again)
  //  - 'perLoad' : run once per URL per page load (F5 will run again)
  const RUN_POLICY = 'perTab'; // If necessary, change this option and save changes

  // Substring that appears in sort dropdown ids/controls
  const SORT_ID_SUBSTR = 'browse-sort-drop-down';

  // The target option id suffix: "opt1" = Viewers (High to Low) in current Twitch UI
  const TARGET_SUFFIX = 'opt1';
  // ---------------------------------------

  // utils
  const waitFor = (selector, { timeout = 15000, interval = 150, filter = null } = {}) =>
    new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        const nodes = Array.from(document.querySelectorAll(selector));
        const el = filter ? nodes.find(filter) : nodes[0];
        if (el) return resolve(el);
        if (Date.now() - t0 > timeout) return reject(new Error('timeout:' + selector));
        setTimeout(poll, interval);
      })();
    });

  const safeClick = (el) => { try { el.click(); } catch (_) {} };

  // keying
  const urlPart = () => {
    const u = new URL(location.href);
    u.searchParams.delete('sort'); // ignore Twitch sort param
    return `${u.pathname}${u.search}`;
  };
  const loadPart = () => `${performance.timeOrigin}`; // unique per page load

  const keyForUrl = () => {
    if (RUN_POLICY === 'perLoad') return `tw_sort_opt1_${urlPart()}_${loadPart()}`;
    if (RUN_POLICY === 'perTab')  return `tw_sort_opt1_${urlPart()}`;
    return '';
  };

  const alreadyRan = () => !!sessionStorage.getItem(keyForUrl());
  const markRan = () => sessionStorage.setItem(keyForUrl(), '1');

  async function ensureSortOpt1() {
    if (!document.querySelector(`[role="combobox"][aria-controls*="${SORT_ID_SUBSTR}"]`)) return;
    if (alreadyRan()) return;

    try {
      const combo = await waitFor(
        `[role="combobox"][aria-controls*="${SORT_ID_SUBSTR}"]`
      );

      const current = combo.getAttribute('aria-activedescendant') || '';
      if (current.endsWith(TARGET_SUFFIX)) { markRan(); return; }

      safeClick(combo);
      const option = await waitFor(
        `[id$="${TARGET_SUFFIX}"][role="menuitemradio"], [id$="${TARGET_SUFFIX}"][role="option"], [id$="${TARGET_SUFFIX}"]`,
        { filter: (el) => !!(el.offsetParent || el.getClientRects().length) }
      );
      safeClick(option);
	  
	  // remove focus to avoid white outline on <h1>Browse
	  setTimeout(() => {
	  document.activeElement?.blur();
	  }, 0);

      markRan();
    } catch (_) {
      // silent fail
    }
  }

  // initial run
  setTimeout(ensureSortOpt1, 1000);

  // SPA navigation hook
  (function hookHistory() {
    const fire = () => window.dispatchEvent(new Event('locationchange'));
    const p = history.pushState, r = history.replaceState;
    history.pushState = function () { p.apply(this, arguments); fire(); };
    history.replaceState = function () { r.apply(this, arguments); fire(); };
    window.addEventListener('popstate', fire);
  })();

  window.addEventListener('locationchange', () => {
    setTimeout(ensureSortOpt1, 600);
  });
})();
