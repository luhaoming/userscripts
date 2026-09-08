// ==UserScript==
// @name         快樂工具人：AI 對話小幫手 (GPT/Gemini)
// @description  ChatGPT、Gemini 對話時間軸、Markdown/HTML 匯出與快速追問。
// @namespace    happy-toolman
// @version      2026-09-08.002
// @author       快樂工具人 (Haoming Lu)
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// @match        *://gemini.google.com/*
// @noframes
// @license       MIT
// @run-at        document-idle
// @grant         GM_addStyle
// @grant         GM_getValue
// @grant         GM_registerMenuCommand
// @grant         GM_setValue
// @updateURL     https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/ai-chat-toolkit.user.js
// @downloadURL   https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/ai-chat-toolkit.user.js
// ==/UserScript==

(() => {
'use strict';

const VERSION = '2026-09-08.002';
const LOGO_URL = 'https://buy.sirii.cf/favicon.ico';
const DEFAULT_ACTIONS = [
  { icon: '💡', label: '詳細說明', prompt: '請更詳細地解釋上面的回答。' },
  { icon: '🔍', label: '白話解釋', prompt: '請用白話、容易理解的方式解釋上面的回答。' },
  { icon: '📋', label: '可執行步驟', prompt: '請整理成可直接執行的步驟。' },
  { icon: '🧠', label: '本串重點', prompt: '請整理這串對話的重點、結論與待辦事項。' }
];
const I18N = {
  zh: { brand: '快樂工具人 · AI 對話小幫手', export: '匯出', markdown: '匯出 Markdown', html: '匯出 HTML', actions: '快速追問（只填入，不送出）', edit: '自訂指令', timelineShow: '顯示對話時間軸', timelineHide: '隱藏對話時間軸', language: '切換語系：English', version: '版本', editorTitle: '自訂快速指令', editorHint: '每行格式：圖示 | 標籤 | 要填入的指令', save: '儲存', reset: '還原預設', cancel: '取消', inputMissing: '找不到輸入框，請重新整理後再試。' },
  en: { brand: 'Happy Toolman · AI Chat Helper', export: 'Export', markdown: 'Export Markdown', html: 'Export HTML', actions: 'Quick prompts (fill only)', edit: 'Custom prompts', timelineShow: 'Show timeline', timelineHide: 'Hide timeline', language: 'Switch language: 中文', version: 'Version', editorTitle: 'Custom quick prompts', editorHint: 'One per line: icon | label | prompt to fill', save: 'Save', reset: 'Reset defaults', cancel: 'Cancel', inputMissing: 'Input box not found. Please refresh and try again.' }
};
const isGemini = location.hostname === 'gemini.google.com';
const platform = isGemini ? 'Gemini' : 'ChatGPT';
let language = GM_getValue('manualLang', navigator.language.startsWith('zh') ? 'zh' : 'en');
let timelineOpen = true;
let timeline;
let timelineToggle;

function t(key) { return I18N[language]?.[key] || I18N.zh[key] || key; }

function getActions() {
  try {
    const saved = GM_getValue('customActions', null);
    if (Array.isArray(saved) && saved.length && saved.every(item => item?.label && item?.prompt)) return saved;
  } catch (_) { /* 使用預設值 */ }
  return DEFAULT_ACTIONS;
}

function getMessages() {
  if (isGemini) return [...document.querySelectorAll('user-query-content,model-response')]
    .map(node => ({ role: node.matches('user-query-content') ? 'user' : 'assistant', node }))
    .filter(item => item.node.textContent.trim());
  const messages = [...document.querySelectorAll('[data-message-author-role="user"],[data-message-author-role="assistant"]')]
    .map(node => ({ role: node.dataset.messageAuthorRole, node }))
    .filter(item => item.node.textContent.trim());
  if (messages.length) return messages;
  // ponytail: ChatGPT selector 改版時的退路；失效後才補更精準 selector。
  return [...document.querySelectorAll('section[data-turn]')]
    .map(node => ({ role: node.dataset.turn, node }))
    .filter(item => ['user', 'assistant'].includes(item.role) && item.node.textContent.trim());
}

function getInput() {
  const selectors = isGemini
    ? ['rich-textarea [contenteditable="true"]', 'textarea']
    : ['#prompt-textarea', 'textarea#prompt-textarea', '[contenteditable="true"][data-lexical-editor="true"]', '[contenteditable="true"]'];
  return selectors.map(selector => document.querySelector(selector)).find(Boolean) || null;
}

function plain(node) {
  return node.textContent.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function clean(node) {
  const root = node.cloneNode(true);
  root.querySelectorAll('script,style,iframe,object,embed,form,button,textarea,input,nav,[aria-label*="操作"]').forEach(el => el.remove());
  root.querySelectorAll('*').forEach(el => [...el.attributes].forEach(attr => {
    if (/^on/i.test(attr.name) || (['href', 'src'].includes(attr.name) && /^javascript:/i.test(attr.value))) el.removeAttribute(attr.name);
  }));
  return root;
}

function markdown(node) {
  const walk = el => {
    if (el.nodeType === Node.TEXT_NODE) return el.nodeValue.replace(/\s+/g, ' ');
    if (el.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = el.tagName.toLowerCase();
    const inner = () => [...el.childNodes].map(walk).join('');
    if (tag === 'br') return '\n';
    if (tag === 'pre') {
      const code = el.querySelector('code') || el;
      const lang = [...code.classList].map(name => name.match(/language-(.+)/)?.[1]).find(Boolean) || '';
      return `\n\n\`\`\`${lang}\n${code.textContent.trim()}\n\`\`\`\n\n`;
    }
    if (tag === 'code') return `\`${plain(el)}\``;
    if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(+tag[1])} ${inner().trim()}\n\n`;
    if (tag === 'strong' || tag === 'b') return `**${inner()}**`;
    if (tag === 'em' || tag === 'i') return `*${inner()}*`;
    if (tag === 'a') return `[${inner().trim()}](${el.href || ''})`;
    if (tag === 'img') return `![${el.alt || ''}](${el.src || ''})`;
    if (tag === 'blockquote') return `\n${inner().trim().split('\n').map(line => `> ${line}`).join('\n')}\n`;
    if (tag === 'ul' || tag === 'ol') return `\n${[...el.children].map((li, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${plain(li)}`).join('\n')}\n`;
    if (tag === 'table') {
      const rows = [...el.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')].map(cell => plain(cell).replace(/\|/g, '\\|')));
      if (!rows.length) return '';
      return `\n| ${rows[0].join(' | ')} |\n| ${rows[0].map(() => '---').join(' | ')} |\n${rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n')}\n`;
    }
    if (['p', 'div', 'section', 'article'].includes(tag)) return `\n${inner().trim()}\n`;
    return inner();
  };
  return walk(clean(node)).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function title() {
  return document.title.replace(/\s*[|｜-]\s*(ChatGPT|Gemini).*$/i, '').trim() || 'AI 對話';
}

function filename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'AI對話';
}

function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function snapshot() {
  return getMessages().map((item, index) => ({ ...item, index: index + 1, plain: plain(item.node), md: markdown(item.node), html: clean(item.node).innerHTML }));
}

function exportMarkdown() {
  const now = new Date().toISOString();
  const name = title();
  const body = snapshot().map(item => `## ${item.role === 'user' ? '你' : platform}\n\n${item.md}`).join('\n\n---\n\n');
  const output = `---\ntitle: "${name.replace(/"/g, '\\"')}"\nplatform: ${platform}\nurl: ${location.href}\nexported_at: ${now}\nexporter_version: ${VERSION}\n---\n\n${body}\n`;
  download(output, `${filename(name)}_${now.slice(0, 10)}.md`, 'text/markdown;charset=utf-8');
}

function exportHtml() {
  const now = new Date().toISOString();
  const name = title();
  const messages = snapshot();
  const nav = messages.filter(item => item.role === 'user').map((item, i) => `<a href="#m${item.index}"><b>${i + 1}</b><span>${escapeHtml(item.plain.slice(0, 72))}</span></a>`).join('');
  const body = messages.map(item => `<article id="m${item.index}" class="message ${item.role}"><header>${item.role === 'user' ? '你' : platform}</header><div class="content">${item.html}</div></article>`).join('');
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
:root{color-scheme:light dark;--bg:#f6f7f9;--card:#fff;--text:#202124;--sub:#667085;--line:#e5e7eb;--user:#e8f1ff;--accent:#2563eb}@media(prefers-color-scheme:dark){:root{--bg:#171717;--card:#242424;--text:#eee;--sub:#a3a3a3;--line:#3f3f46;--user:#183153;--accent:#8ab4f8}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}.layout{display:grid;grid-template-columns:260px minmax(0,820px);gap:28px;max-width:1160px;margin:auto;padding:28px 20px}aside{position:sticky;top:20px;align-self:start}h1{font-size:20px;line-height:1.35;margin:0 0 6px}.meta{font-size:12px;color:var(--sub);overflow-wrap:anywhere}.timeline{display:grid;gap:6px;margin-top:22px;max-height:70vh;overflow:auto}.timeline a{display:grid;grid-template-columns:25px 1fr;gap:8px;color:var(--sub);text-decoration:none;padding:7px;border-radius:8px}.timeline a:hover{background:#2563eb1f;color:var(--text)}.timeline b{color:var(--accent)}.timeline span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:0 0 14px;overflow-wrap:anywhere}.message.user{background:var(--user)}.message header{font-weight:700;font-size:13px;color:var(--sub);margin-bottom:10px}.content pre{overflow:auto;padding:14px;border-radius:9px;background:#111;color:#eee}.content code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.content img{max-width:100%;height:auto}.content table{border-collapse:collapse;display:block;overflow:auto}.content th,.content td{border:1px solid var(--line);padding:6px 9px}@media(max-width:720px){.layout{display:block;padding:16px}aside{position:static;margin-bottom:20px}.timeline{max-height:180px}.message{padding:15px}}
</style></head><body><div class="layout"><aside><h1>${escapeHtml(name)}</h1><div class="meta">${platform} · ${escapeHtml(new Date(now).toLocaleString('zh-TW'))}<br>${escapeHtml(location.href)}</div><nav class="timeline">${nav}</nav></aside><main>${body}</main></div></body></html>`;
  download(html, `${filename(name)}_${now.slice(0, 10)}.html`, 'text/html;charset=utf-8');
}

function fillPrompt(prompt) {
  const input = getInput();
  if (!input) return alert(t('inputMissing'));
  input.focus();
  if (input instanceof HTMLTextAreaElement) {
    input.value = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, prompt);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));
}

function refreshTimeline() {
  if (!timeline) return;
  timeline.replaceChildren(...getMessages().filter(item => item.role === 'user').map((item, i) => {
    const button = document.createElement('button');
    const preview = plain(item.node);
    button.innerHTML = `<b>${i + 1}</b><span>${escapeHtml(preview.slice(0, 70))}</span>`;
    button.title = preview;
    button.onclick = () => item.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return button;
  }));
}

function toggleTimeline() {
  timelineOpen = !timelineOpen;
  timeline.classList.toggle('aitk-show', timelineOpen);
  if (timelineOpen) refreshTimeline();
  if (timelineToggle) timelineToggle.textContent = `↕ ${t(timelineOpen ? 'timelineHide' : 'timelineShow')}`;
}

function showActionEditor() {
  const overlay = document.createElement('div');
  overlay.className = 'aitk-editor-overlay';
  const current = getActions().map(item => `${item.icon || '⚡'} | ${item.label} | ${item.prompt}`).join('\n');
  overlay.innerHTML = `<div class="aitk-editor" role="dialog" aria-modal="true"><h2>${t('editorTitle')}</h2><p>${t('editorHint')}</p><textarea>${escapeHtml(current)}</textarea><div class="aitk-editor-buttons"><button data-do="reset">${t('reset')}</button><span></span><button data-do="cancel">${t('cancel')}</button><button class="aitk-primary" data-do="save">${t('save')}</button></div></div>`;
  const close = () => overlay.remove();
  overlay.onclick = event => { if (event.target === overlay) close(); };
  overlay.querySelector('[data-do="cancel"]').onclick = close;
  overlay.querySelector('[data-do="reset"]').onclick = () => {
    overlay.querySelector('textarea').value = DEFAULT_ACTIONS.map(item => `${item.icon} | ${item.label} | ${item.prompt}`).join('\n');
  };
  overlay.querySelector('[data-do="save"]').onclick = () => {
    const actions = overlay.querySelector('textarea').value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(part => part.trim());
      return { icon: parts[0] || '⚡', label: parts[1], prompt: parts.slice(2).join('|').trim() };
    }).filter(item => item.label && item.prompt);
    if (!actions.length) return;
    GM_setValue('customActions', actions);
    close();
    document.querySelector('#aitk-fab')?.remove();
    createUi();
  };
  document.body.append(overlay);
  overlay.querySelector('textarea').focus();
}

function initialPosition(fab) {
  const x = GM_getValue('fabX', null);
  const y = GM_getValue('fabY', null);
  const left = Number.isFinite(x) ? x : window.innerWidth - 68;
  const top = Number.isFinite(y) ? y : window.innerHeight - 92;
  fab.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 54))}px`;
  fab.style.top = `${Math.max(8, Math.min(top, window.innerHeight - 54))}px`;
}

function createUi() {
  document.querySelector('#aitk-timeline')?.remove();
  GM_addStyle(`
#aitk-fab{position:fixed;z-index:2147483646;font:14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif}#aitk-fab button{border:0;cursor:pointer;font:inherit}#aitk-main{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#fff;color:#2563eb;box-shadow:0 5px 18px #0004;touch-action:none;overflow:hidden}#aitk-main img{width:28px;height:28px;pointer-events:none}#aitk-menu{position:absolute;right:0;bottom:56px;width:240px;padding:8px;border:1px solid #d1d5db;border-radius:14px;background:#fff;color:#1f2937;box-shadow:0 10px 30px #0003;display:none}#aitk-fab.aitk-open #aitk-menu{display:block}.aitk-brand{display:flex;align-items:center;gap:8px;padding:5px 7px 9px;font-weight:700}.aitk-brand img{width:22px;height:22px;border-radius:5px}.aitk-title{font-size:11px;color:#6b7280;padding:7px 8px 4px}.aitk-item{display:flex;width:100%;padding:9px;border-radius:8px;background:transparent;color:inherit;text-align:left}.aitk-item:hover{background:#eef2ff}.aitk-rule{border:0;border-top:1px solid #e5e7eb;margin:6px 0}.aitk-version{font-size:11px;color:#6b7280;padding:7px 8px 3px}#aitk-timeline{position:fixed;right:22px;bottom:82px;z-index:2147483645;width:270px;max-height:min(65vh,620px);padding:8px;border:1px solid #d1d5db;border-radius:14px;background:#fff;color:#1f2937;box-shadow:0 10px 30px #0003;display:none;overflow:auto;font:13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}#aitk-timeline.aitk-show{display:grid;gap:3px}#aitk-timeline button{display:grid;grid-template-columns:26px 1fr;gap:7px;border:0;border-radius:8px;padding:8px;background:transparent;color:inherit;text-align:left;cursor:pointer}#aitk-timeline button:hover{background:#eef2ff}#aitk-timeline b{color:#2563eb}#aitk-timeline span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.aitk-editor-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:#0008;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.aitk-editor{width:min(620px,100%);padding:20px;border-radius:14px;background:#fff;color:#1f2937;box-shadow:0 15px 40px #0005}.aitk-editor h2{margin:0}.aitk-editor p{margin:4px 0 12px;color:#6b7280}.aitk-editor textarea{width:100%;min-height:220px;padding:10px;border:1px solid #d1d5db;border-radius:8px;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical}.aitk-editor-buttons{display:flex;gap:8px;margin-top:12px}.aitk-editor-buttons span{flex:1}.aitk-editor button{border:0;border-radius:7px;padding:8px 11px;cursor:pointer}.aitk-editor .aitk-primary{background:#2563eb;color:#fff}@media(prefers-color-scheme:dark){#aitk-menu,#aitk-timeline,.aitk-editor{background:#262626;color:#eee;border-color:#525252}.aitk-title,.aitk-version,.aitk-editor p{color:#a3a3a3}.aitk-item:hover,#aitk-timeline button:hover{background:#303c57}.aitk-rule{border-color:#525252}.aitk-editor textarea{background:#171717;color:#eee;border-color:#525252}}
`);
  const fab = document.createElement('div');
  fab.id = 'aitk-fab';
  const actions = getActions();
  fab.innerHTML = `<button id="aitk-main" title="${t('brand')}"><img src="${LOGO_URL}" alt="快樂工具人"></button><div id="aitk-menu"><div class="aitk-brand"><img src="${LOGO_URL}" alt=""><span>${t('brand')}</span></div><div class="aitk-title">${t('export')}</div><button class="aitk-item" data-do="md">📝 ${t('markdown')}</button><button class="aitk-item" data-do="html">🌐 ${t('html')}</button><hr class="aitk-rule"><div class="aitk-title">${t('actions')}</div>${actions.map((item, i) => `<button class="aitk-item" data-action="${i}">${item.icon || '⚡'} ${escapeHtml(item.label)}</button>`).join('')}<button class="aitk-item" data-do="edit">⚙️ ${t('edit')}</button><hr class="aitk-rule"><button class="aitk-item" data-do="timeline">↕ ${t('timelineHide')}</button><button class="aitk-item" data-do="language">🌐 ${t('language')}</button><div class="aitk-version">${t('version')} v${VERSION}</div></div>`;
  timeline = document.createElement('div');
  timeline.id = 'aitk-timeline';
  timeline.classList.add('aitk-show');
  document.body.append(fab, timeline);
  initialPosition(fab);
  fab.querySelectorAll('img').forEach(image => { image.onerror = () => { image.style.display = 'none'; }; });
  const main = fab.querySelector('#aitk-main');
  let dragStart;
  let didDrag = false;
  main.onpointerdown = event => {
    dragStart = { x: event.clientX, y: event.clientY, left: fab.offsetLeft, top: fab.offsetTop };
    didDrag = false;
    main.setPointerCapture(event.pointerId);
  };
  main.onpointermove = event => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
    if (!didDrag) return;
    fab.style.left = `${Math.max(8, Math.min(dragStart.left + dx, window.innerWidth - 54))}px`;
    fab.style.top = `${Math.max(8, Math.min(dragStart.top + dy, window.innerHeight - 54))}px`;
  };
  main.onpointerup = event => {
    if (dragStart && didDrag) {
      GM_setValue('fabX', fab.offsetLeft);
      GM_setValue('fabY', fab.offsetTop);
    }
    dragStart = null;
    try { main.releasePointerCapture(event.pointerId); } catch (_) { /* 已釋放 */ }
  };
  main.onclick = event => { event.stopPropagation(); if (!didDrag) fab.classList.toggle('aitk-open'); };
  fab.querySelector('#aitk-menu').onclick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.do === 'md') exportMarkdown();
    if (button.dataset.do === 'html') exportHtml();
    if (button.dataset.do === 'timeline') toggleTimeline();
    if (button.dataset.do === 'edit') showActionEditor();
    if (button.dataset.do === 'language') { GM_setValue('manualLang', language === 'zh' ? 'en' : 'zh'); location.reload(); }
    if (button.dataset.action !== undefined) fillPrompt(getActions()[+button.dataset.action]?.prompt);
    fab.classList.remove('aitk-open');
  };
  timelineToggle = fab.querySelector('[data-do="timeline"]');
  refreshTimeline();
  document.addEventListener('click', event => { if (!fab.contains(event.target)) fab.classList.remove('aitk-open'); });
}

function init() {
  if (document.querySelector('#aitk-fab')) return;
  createUi();
  GM_registerMenuCommand('匯出 Markdown', exportMarkdown);
  GM_registerMenuCommand('匯出 HTML', exportHtml);
}

let refreshTimer;
new MutationObserver(() => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { if (timelineOpen) refreshTimeline(); }, 600);
}).observe(document.documentElement, { childList: true, subtree: true });
init();
setTimeout(init, 1500);
})();
