// ==UserScript==
// @name         Twitch - Force sort Viewers High to Low
// @namespace    twitch-force-sort-viewers
// @version      1.8.6
// @description  Auto-set sort to "Viewers High->Low" with configurable run policy
// @author       Vikindor (https://vikindor.github.io/)
// @homepageURL  https://github.com/Vikindor/twitch-force-sort-viewers/
// @supportURL   https://github.com/Vikindor/twitch-force-sort-viewers/issues
// @license      MIT
// @match        https://www.twitch.tv/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- CONFIG ----------------
  // 'perLoad' -> run once per URL on each page load; refreshing the page will apply the sort again
  // 'perTab'  -> run once per URL per tab session; after that, it won't overwrite your manual sort changes
  const RUN_POLICY = 'perLoad';
  // ----------------------------------------
  
  const TARGET_LABELS = [
    "Viewers (High to Low)",
    "Seere (høj-lav)",
    "Zuschauer (viel -> wenig)",
    "Espectadores (descend.)",
    "Más espectadores",
    "Spectateurs (décroissant)",
    "Spettatori (decr.)",
    "Nézők száma (csökkenő)",
    "Kijkers (hoog - laag)",
    "Seere (høyt til lavt)",
    "Widzów (najwięcej)",
    "Espetadores (ordem desc.)",
    "Espectadores (ordem decrescente)",
    "Vizualizatori (mare la mic)",
    "Divákov (zostupne)",
    "Katsojaluku (suurin ensin)",
    "Tittare (flest först)",
    "Lượng xem (Cao đến thấp)",
    "İzleyici (çoktan aza)",
    "Diváků (sestupně)",
    "Θεατές (Φθίν. ταξιν.)",
    "Зрители (низходящ ред)",
    "Аудитория (по убыв.)",
    "ผู้ชม (สูงไปต่ำ)",
    "المشاهدون (من الأعلى إلى الأقل)",
    "观众人数（高到低）",
    "觀眾人數 (高到低)",
    "視聴者数（降順）",
    "시청자 수 (높은 순)"
  ];

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
  const isVisible = (el) => !!(el && (el.offsetParent || el.getClientRects().length));

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function isTargetLabel(text) {
    return TARGET_LABELS.includes(normalizeText(text));
  }

  function extractOptionLabel(el) {
    return normalizeText(
      el?.getAttribute('aria-label') ||
      el?.getAttribute('title') ||
      el?.textContent ||
      ''
    );
  }

  function blurAfterAutoAction(...relatedEls) {
    requestAnimationFrame(() => {
      const activeEl = document.activeElement;
      if (!activeEl || activeEl === document.body) return;
      if (!relatedEls.includes(activeEl)) return;

      try { activeEl.blur(); } catch (_) {}
    });
  }

  function getNormalizedUrl() {
    const u = new URL(location.href);
    u.searchParams.delete('sort');
    return `${u.pathname}${u.search}`;
  }

  function getRunKey() {
    if (RUN_POLICY === 'perLoad') return `tw_sort_viewers_high_to_low_${getNormalizedUrl()}_${performance.timeOrigin}`;
    if (RUN_POLICY === 'perTab') return `tw_sort_viewers_high_to_low_${getNormalizedUrl()}`;
    return '';
  }

  const alreadyRan = () => !!sessionStorage.getItem(getRunKey());
  const markRan = () => sessionStorage.setItem(getRunKey(), '1');

  async function ensureTargetSort() {
    if (alreadyRan()) return;

    try {
      const combo = await waitFor(
        '[role="combobox"][id*="browse-sort-drop-down"], [role="combobox"][aria-controls*="browse-sort-drop-down"]'
      );

      const labelEl = combo.querySelector('[data-a-target="tw-core-button-label-text"]');
      const labelText = normalizeText(labelEl ? labelEl.textContent : combo.textContent);
      if (isTargetLabel(labelText)) {
        markRan();
        return;
      }

      safeClick(combo);
      const option = await waitFor(
        '[role="menuitemradio"], [role="option"]',
        { filter: (el) => isVisible(el) && isTargetLabel(extractOptionLabel(el)) }
      );
      safeClick(option);
      blurAfterAutoAction(combo, option);

      markRan();
    } catch (_) {
      // Ignore transient Twitch render timing failures and try again on the next navigation/load.
    }
  }

  setTimeout(() => { ensureTargetSort(); }, 500);

  (function hookHistory() {
    const fire = () => window.dispatchEvent(new Event('locationchange'));
    const p = history.pushState, r = history.replaceState;
    history.pushState = function () { p.apply(this, arguments); fire(); };
    history.replaceState = function () { r.apply(this, arguments); fire(); };
    window.addEventListener('popstate', fire);
  })();

  window.addEventListener('locationchange', () => {
    setTimeout(() => { ensureTargetSort(); }, 600);
  });
})();
