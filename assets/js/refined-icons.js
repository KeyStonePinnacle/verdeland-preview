/* Small line arrows for static copy and dynamically rendered project controls. */
(() => {
  'use strict';
  if (document.documentElement.hasAttribute('data-refined-icons')) return;
  document.documentElement.setAttribute('data-refined-icons', 'ready');

  const arrows = {
    '→': ['right', 0], '↗': ['up-right', -45],
    '↑': ['up', -90], '↖': ['up-left', -135],
    '←': ['left', 180], '↙': ['down-left', 135],
    '↓': ['down', 90], '↘': ['down-right', 45]
  };
  const matchArrow = /[→↗↑↖←↙↓↘]/u;
  const splitArrows = /([→↗↑↖←↙↓↘]\uFE0F?)/u;
  const ignored = 'script,style,noscript,template,svg,math,input,textarea,select,option,pre,code';
  const namespace = 'http://www.w3.org/2000/svg';
  const pending = new Set();
  let scheduled = false, observer;

  function eligible(node) {
    const parent = node.parentElement;
    return !!parent && !parent.closest(ignored) && !parent.isContentEditable &&
      matchArrow.test(node.data);
  }

  function icon(character) {
    const [direction, rotation] = arrows[character];
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'vl-icon-arrow');
    svg.setAttribute('data-direction', direction);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', 'M5 12h14M13 6l6 6-6 6');
    if (rotation) path.setAttribute('transform', `rotate(${rotation} 12 12)`);
    svg.append(path);
    return svg;
  }

  function preserveControlName(node) {
    const control = node.parentElement.closest('a[href],button,[role="button"],[role="link"]');
    if (!control || control.getAttribute('aria-label')?.trim() || control.getAttribute('title')?.trim()) return;
    const labelledBy = control.getAttribute('aria-labelledby')?.trim().split(/\s+/) || [];
    if (labelledBy.some(id => document.getElementById(id)?.textContent.trim())) return;
    if ([...control.querySelectorAll('img[alt]')].some(image => image.alt.trim())) return;
    const words = control.textContent.replace(/[→↗↑↖←↙↓↘\uFE0F]/gu, '').trim();
    if (words) return;
    // Flag an otherwise unnamed arrow-only control for review, while retaining
    // a usable directional name after its decorative glyph becomes an SVG.
    const character = node.data.match(matchArrow)?.[0];
    const names = { '→': 'Next', '←': 'Previous', '↑': 'Up', '↓': 'Down',
      '↗': 'Upper right', '↖': 'Upper left', '↘': 'Lower right', '↙': 'Lower left' };
    control.setAttribute('data-refined-icon-needs-label', 'true');
    control.setAttribute('aria-label', control.matches('a[href],[role="link"]') ? 'Open link' : names[character]);
  }

  function replace(node) {
    if (!eligible(node)) return;
    preserveControlName(node);
    const fragment = document.createDocumentFragment();
    for (const part of node.data.split(splitArrows)) {
      if (!part) continue;
      const character = part.replace(/\uFE0F/gu, '');
      fragment.append(Object.hasOwn(arrows, character) ? icon(character) : document.createTextNode(part));
    }
    // Keep mixed text and arrows in one flex item. A raw SVG alongside a text
    // node would otherwise inherit the parent's large CTA gap or change wrapping.
    if (node.data.replace(/[→↗↑↖←↙↓↘\uFE0F]/gu, '').trim() &&
        !node.parentElement.closest('.vl-arrow-run')) {
      const run = document.createElement('span');
      run.className = 'vl-arrow-run';
      run.append(fragment);
      node.replaceWith(run);
    } else node.replaceWith(fragment);
  }

  function enhance(root) {
    if (!root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) return replace(root);
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches(ignored) || root.isContentEditable) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replace);
  }

  function collect(records) {
    for (const record of records) {
      if (record.type === 'characterData') pending.add(record.target);
      else record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) pending.add(node);
      });
    }
  }

  function flush() {
    scheduled = false;
    collect(observer.takeRecords());
    observer.disconnect();
    try {
      const roots = [...pending]; pending.clear();
      roots.forEach(root => {
        if (!roots.some(other => other !== root && other.contains(root))) enhance(root);
      });
    } finally {
      observer.observe(document.body, {subtree: true, childList: true, characterData: true});
    }
  }

  function start() {
    enhance(document.body);
    observer = new MutationObserver(records => {
      collect(records);
      if (!scheduled && pending.size) { scheduled = true; queueMicrotask(flush); }
    });
    observer.observe(document.body, {subtree: true, childList: true, characterData: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
