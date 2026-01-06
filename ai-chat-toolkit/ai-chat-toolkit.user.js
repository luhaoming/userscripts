// ==UserScript==
// @name        快樂工具人聊天小幫手
// @name:en     Happy Toolman Chat Helper
// @description AI 對話匯出與快捷指令工具箱
// @description:en Export chat to MD/JSON/HTML/TXT + quick actions for ChatGPT/Gemini/Grok/Claude
// @namespace   happy-toolman
// @version     2025-01-06.011
// @author      快樂工具人(Haoming Lu)
// @icon        https://raw.githubusercontent.com/luhaoming/userscripts/main/assets/logo.png
// @match       *://chatgpt.com/*
// @match       *://chat.openai.com/*
// @match       *://grok.com/*
// @match       *://gemini.google.com/*
// @match       *://claude.ai/*
// @noframes
// @sandbox     raw
// @license     MIT
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @updateURL   https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/ai-chat-toolkit.user.js
// @downloadURL https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/ai-chat-toolkit.user.js
// ==/UserScript==

(function() {
'use strict';

const VERSION = '2025-01-06.011';

// ========== Trusted Types Policy (for Gemini) ==========
let trustedPolicy = null;
if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
  try {
    trustedPolicy = trustedTypes.createPolicy('aitk', {
      createHTML: s => s,
      createScriptURL: s => s,
      createScript: s => s
    });
  } catch (e) {
    // Policy already exists or not supported
  }
}

const safeParseHTML = (html) => {
  const parser = new DOMParser();
  if (trustedPolicy) {
    return parser.parseFromString(trustedPolicy.createHTML(html), 'text/html');
  }
  return parser.parseFromString(html, 'text/html');
};

// ========== Platform Detection ==========
const Platform = {
  detect() {
    const host = location.hostname;
    if (host.includes('chatgpt.com') || host.includes('openai.com')) return 'chatgpt';
    if (host.includes('grok.com')) return 'grok';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('claude.ai')) return 'claude';
    return null;
  },

  getSelectors(platform) {
    const selectors = {
      chatgpt: {
        messages: 'div[data-message-id]',
        user: '[data-message-author-role="user"]',
        assistant: '[data-message-author-role="assistant"]',
        title: '#history a[data-active]',
        codeBlock: 'pre',
        codeLang: 'div > div:first-child',
        codeContent: 'div > div:nth-child(3) > code, code',
        inputBox: 'div[contenteditable="true"], textarea#prompt-textarea'
      },
      grok: {
        messages: 'div.message-bubble',
        user: null,
        assistant: null,
        title: null,
        codeBlock: 'div.not-prose',
        codeLang: 'div > div > span',
        codeContent: 'div > div:nth-child(3) > code, code',
        inputBox: 'textarea'
      },
      gemini: {
        messages: 'user-query-content, model-response',
        user: 'user-query-content',
        assistant: 'model-response',
        title: 'conversations-list div.selected',
        codeBlock: 'code-block',
        codeLang: 'div > div > span',
        codeContent: 'div > div:nth-child(2) > div > pre, pre',
        inputBox: 'rich-textarea div[contenteditable="true"], textarea'
      },
      claude: {
        messages: '[data-testid="user-human-turn"], [data-testid="assistant-turn"], div.font-user-message, div.font-claude-message',
        user: '[data-testid="user-human-turn"], div.font-user-message',
        assistant: '[data-testid="assistant-turn"], div.font-claude-message',
        title: null,
        codeBlock: 'pre',
        codeLang: '.text-text-300, [class*="language-"]',
        codeContent: 'code',
        inputBox: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"]'
      }
    };
    return selectors[platform] || null;
  },

  getModelName(platform) {
    const models = { chatgpt: 'ChatGPT', grok: 'Grok', gemini: 'Gemini', claude: 'Claude' };
    return models[platform] || 'Unknown';
  }
};

// ========== HTML to Markdown Converter ==========
const Converter = {
  toMarkdown(html, platform) {
    const doc = safeParseHTML(html);
    
    doc.querySelectorAll('span.katex-html, mrow').forEach(el => el.remove());
    
    doc.querySelectorAll('annotation[encoding="application/x-tex"]').forEach(el => {
      const tex = el.textContent.trim();
      const isBlock = el.closest('.katex-display');
      el.replaceWith(isBlock ? `\n$$\n${tex}\n$$\n` : `$${tex}$`);
    });

    const sel = Platform.getSelectors(platform);
    if (sel) {
      doc.querySelectorAll(sel.codeBlock).forEach(pre => {
        const langEl = pre.querySelector(sel.codeLang);
        const codeEl = pre.querySelector(sel.codeContent);
        const lang = langEl?.textContent?.trim().toLowerCase() || '';
        const code = codeEl?.textContent || pre.textContent;
        pre.textContent = `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
      });
    }

    doc.querySelectorAll('strong, b').forEach(el => el.replaceWith(`**${el.textContent}**`));
    doc.querySelectorAll('em, i').forEach(el => el.replaceWith(`*${el.textContent}*`));
    doc.querySelectorAll('p code, span code').forEach(el => el.replaceWith(`\`${el.textContent}\``));
    doc.querySelectorAll('a').forEach(el => el.replaceWith(`[${el.textContent}](${el.href})`));
    doc.querySelectorAll('img').forEach(el => el.replaceWith(`![${el.alt || ''}](${el.src})`));

    doc.querySelectorAll('ul').forEach(ul => {
      let md = '\n';
      ul.querySelectorAll(':scope > li').forEach(li => md += `- ${li.textContent.trim()}\n`);
      ul.replaceWith(md);
    });
    doc.querySelectorAll('ol').forEach(ol => {
      let md = '\n';
      ol.querySelectorAll(':scope > li').forEach((li, i) => md += `${i + 1}. ${li.textContent.trim()}\n`);
      ol.replaceWith(md);
    });

    for (let i = 1; i <= 6; i++) {
      doc.querySelectorAll(`h${i}`).forEach(h => h.replaceWith(`\n${'#'.repeat(i)} ${h.textContent}\n`));
    }

    doc.querySelectorAll('p').forEach(p => p.replaceWith(`\n${p.textContent}\n`));

    doc.querySelectorAll('table').forEach(table => {
      let md = '\n';
      const headers = table.querySelectorAll('thead th');
      if (headers.length) {
        md += '| ' + [...headers].map(th => th.textContent).join(' | ') + ' |\n';
        md += '| ' + [...headers].map(() => '---').join(' | ') + ' |\n';
      }
      table.querySelectorAll('tbody tr').forEach(tr => {
        md += '| ' + [...tr.querySelectorAll('td')].map(td => td.textContent).join(' | ') + ' |\n';
      });
      table.replaceWith(md);
    });

    let markdown = doc.body.innerHTML.replace(/<[^>]*>/g, '');
    return markdown
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
      .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/\n{3,}/g, '\n\n').trim();
  }
};

// ========== Chat Extractor ==========
const Extractor = {
  getMessages(platform) {
    const sel = Platform.getSelectors(platform);
    if (!sel) return [];

    const messages = [];

    if (platform === 'gemini') {
      const users = document.querySelectorAll('user-query-content');
      const assistants = document.querySelectorAll('model-response');
      const len = Math.max(users.length, assistants.length);
      for (let i = 0; i < len; i++) {
        if (users[i]) messages.push({ role: 'user', html: users[i].innerHTML, text: users[i].textContent });
        if (assistants[i]) messages.push({ role: 'assistant', html: assistants[i].innerHTML, text: assistants[i].textContent });
      }
      return messages;
    }

    document.querySelectorAll(sel.messages).forEach((el, idx) => {
      let role = 'unknown';
      if (platform === 'grok') {
        role = idx % 2 === 0 ? 'user' : 'assistant';
      } else if (platform === 'claude') {
        if (el.matches('[data-testid="user-human-turn"], div.font-user-message')) role = 'user';
        else if (el.matches('[data-testid="assistant-turn"], div.font-claude-message')) role = 'assistant';
      } else {
        if (el.matches(sel.user)) role = 'user';
        else if (el.matches(sel.assistant)) role = 'assistant';
      }
      messages.push({ role, html: el.innerHTML, text: el.textContent });
    });
    return messages;
  },

  getTitle(platform) {
    const sel = Platform.getSelectors(platform);
    if (!sel?.title) return null;
    return document.querySelector(sel.title)?.textContent?.trim() || null;
  },

  getMetadata(platform) {
    return {
      platform: Platform.getModelName(platform),
      url: location.href,
      exportedAt: new Date().toISOString(),
      exporterVersion: VERSION,
      title: this.getTitle(platform) || 'Untitled Chat'
    };
  }
};

// ========== Formatters ==========
const Formatter = {
  markdown(messages, metadata, platform) {
    let md = `---
title: "${metadata.title}"
platform: ${metadata.platform}
url: ${metadata.url}
exported_at: ${metadata.exportedAt}
exporter_version: ${metadata.exporterVersion}
---

`;
    messages.forEach(msg => {
      const label = msg.role === 'user' ? 'User' : metadata.platform;
      md += `## ${label}\n\n${Converter.toMarkdown(msg.html, platform)}\n\n---\n\n`;
    });
    return md.trim();
  },

  json(messages, metadata, platform) {
    return JSON.stringify({
      metadata,
      messages: messages.map(msg => ({
        role: msg.role,
        content: { text: msg.text.trim(), markdown: Converter.toMarkdown(msg.html, platform) }
      }))
    }, null, 2);
  },

  html(messages, metadata) {
    const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(metadata.title)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#f5f5f5}
    .meta{background:#e8e8e8;padding:15px;border-radius:8px;margin-bottom:20px;font-size:.9em;color:#666}
    .msg{background:#fff;padding:20px;margin:10px 0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    .msg.user{background:#e3f2fd}.role{font-weight:700;margin-bottom:10px}
    pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}
  </style>
</head>
<body>
  <div class="meta"><strong>${esc(metadata.title)}</strong><br>Platform: ${metadata.platform} | Exported: ${new Date(metadata.exportedAt).toLocaleString()}<br><a href="${metadata.url}">Original</a></div>
`;
    messages.forEach(msg => {
      html += `  <div class="msg ${msg.role}"><div class="role">${msg.role === 'user' ? 'User' : metadata.platform}</div><div>${msg.html}</div></div>\n`;
    });
    return html + `  <script>hljs.highlightAll()<\/script>\n</body></html>`;
  },

  text(messages, metadata) {
    let txt = `${metadata.title}\nPlatform: ${metadata.platform}\nURL: ${metadata.url}\nExported: ${metadata.exportedAt}\n${'='.repeat(50)}\n\n`;
    messages.forEach(msg => {
      txt += `[${msg.role === 'user' ? 'User' : metadata.platform}]\n${msg.text.trim()}\n\n${'-'.repeat(40)}\n\n`;
    });
    return txt.trim();
  }
};

// ========== Downloader ==========
const Downloader = {
  save(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  },
  sanitize: name => (name.replace(/[\/\\?%*:|"<>]/g, '_').trim().slice(0, 100) || 'chat')
};

// ========== Quick Actions ==========
const defaultActions = [
  { id: 'summary', icon: '📋', label: '摘要對話', prompt: '請用一句話摘要上面的對話紀錄' },
  { id: 'continue', icon: '➡️', label: '繼續', prompt: '請繼續' },
  { id: 'translate', icon: '🌐', label: '翻譯中文', prompt: '請將上面的回覆翻譯成繁體中文' },
  { id: 'simplify', icon: '✂️', label: '精簡回答', prompt: '請用更簡短的方式重新回答' },
  { id: 'explain', icon: '💡', label: '詳細解釋', prompt: '請更詳細地解釋上面的回答' }
];

const QuickAction = {
  getActions() {
    const saved = GM_getValue('customActions', null);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return defaultActions;
  },

  saveActions(actions) {
    GM_setValue('customActions', JSON.stringify(actions));
  },

  resetActions() {
    GM_setValue('customActions', JSON.stringify(defaultActions));
  },

  sendMessage(platform, text) {
    const sel = Platform.getSelectors(platform);
    if (!sel?.inputBox) return false;

    const box = document.querySelector(sel.inputBox);
    if (!box) return false;

    box.focus();

    if (box.tagName === 'TEXTAREA') {
      box.value = text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('insertText', false, text);
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      const sendBtn = document.querySelector(
        'button[data-testid="send-button"], ' +
        'button[aria-label*="Send"], ' +
        'button[aria-label*="送出"], ' +
        'button[aria-label*="Submit"], ' +
        'button.send-button, ' +
        'button[class*="send"], ' +
        'button[class*="submit"]'
      );
      if (sendBtn && !sendBtn.disabled) sendBtn.click();
    }, 150);

    return true;
  },

  showEditor() {
    const actions = this.getActions();
    const defaultActions = [
      { icon: '📋', label: '摘要對話', prompt: '請用一句話摘要上面的對話紀錄' },
      { icon: '✏️', label: '編輯', prompt: '請編輯' },
      { icon: '🌐', label: '翻譯中文', prompt: '請將上面的回覆翻譯成繁體中文' },
      { icon: '✂️', label: '精簡回答', prompt: '請用更簡短的方式重新回答' },
      { icon: '💡', label: '詳細解釋', prompt: '請更詳細地解釋上面的回答' }
    ];

    // Overlay with !important to override any platform styles
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed!important;inset:0!important;background:rgba(0,0,0,0.6)!important;z-index:999999999!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;box-sizing:border-box!important;';
    
    // Editor container
    const editor = document.createElement('div');
    editor.style.cssText = 'background:#fff!important;border-radius:12px!important;width:100%!important;max-width:600px!important;max-height:80vh!important;overflow:auto!important;box-shadow:0 8px 32px rgba(0,0,0,0.3)!important;position:relative!important;';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex!important;justify-content:space-between!important;align-items:center!important;padding:20px!important;border-bottom:1px solid #eee!important;font-weight:600!important;font-size:16px!important;position:sticky!important;top:0!important;background:#fff!important;z-index:1!important;color:#333!important;';
    
    const headerTitle = document.createElement('span');
    headerTitle.textContent = '編輯快捷指令';
    headerTitle.style.cssText = 'color:#333!important;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none!important;border:none!important;font-size:24px!important;cursor:pointer!important;color:#999!important;padding:0!important;width:30px!important;height:30px!important;line-height:1!important;';
    closeBtn.onmouseover = () => closeBtn.style.color = '#333';
    closeBtn.onmouseout = () => closeBtn.style.color = '#999';
    
    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    editor.appendChild(header);

    // Hint
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:16px 20px!important;font-size:13px!important;color:#666!important;background:#f8f9fa!important;';
    hint.textContent = '格式：icon | 名稱 | 指令內容（每行一個）';
    editor.appendChild(hint);

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'display:block!important;width:calc(100% - 40px)!important;margin:16px 20px!important;min-height:300px!important;border:1px solid #ddd!important;border-radius:8px!important;padding:12px!important;font-size:14px!important;resize:vertical!important;font-family:monospace!important;line-height:1.6!important;color:#333!important;background:#fff!important;box-sizing:border-box!important;';
    textarea.value = actions.map(a => `${a.icon} | ${a.label} | ${a.prompt}`).join('\n');
    editor.appendChild(textarea);

    // Buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex!important;justify-content:flex-end!important;gap:10px!important;padding:0 20px 20px!important;position:sticky!important;bottom:0!important;background:#fff!important;';
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重設預設';
    resetBtn.style.cssText = 'padding:10px 20px!important;border-radius:6px!important;border:1px solid #ddd!important;cursor:pointer!important;font-size:14px!important;background:#f5f5f5!important;color:#666!important;';
    resetBtn.onmouseover = () => resetBtn.style.background = '#eee';
    resetBtn.onmouseout = () => resetBtn.style.background = '#f5f5f5';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '儲存';
    saveBtn.style.cssText = 'padding:10px 20px!important;border-radius:6px!important;border:none!important;cursor:pointer!important;font-size:14px!important;background:#4a9eff!important;color:#fff!important;';
    saveBtn.onmouseover = () => saveBtn.style.background = '#3a8eef';
    saveBtn.onmouseout = () => saveBtn.style.background = '#4a9eff';
    
    buttons.appendChild(resetBtn);
    buttons.appendChild(saveBtn);
    editor.appendChild(buttons);

    overlay.appendChild(editor);
    document.body.appendChild(overlay);

    // Event handlers
    const close = () => overlay.remove();
    closeBtn.onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };

    resetBtn.onclick = () => {
      this.resetActions();
      textarea.value = defaultActions.map(a => `${a.icon} | ${a.label} | ${a.prompt}`).join('\n');
    };

    saveBtn.onclick = () => {
      const text = textarea.value;
      const lines = text.split('\n').filter(l => l.trim());
      const newActions = lines.map((line, i) => {
        const parts = line.split('|').map(p => p.trim());
        return {
          id: 'custom_' + i,
          icon: parts[0] || '⚡',
          label: parts[1] || '指令' + (i + 1),
          prompt: parts[2] || ''
        };
      }).filter(a => a.prompt);
      
      this.saveActions(newActions);
      close();
      location.reload();
    };
  }
};

// ========== Export Functions ==========
function exportChat(format) {
  const platform = Platform.detect();
  if (!platform) return alert('不支援此平台');

  const messages = Extractor.getMessages(platform);
  if (!messages.length) return alert('找不到對話內容');

  const metadata = Extractor.getMetadata(platform);
  const baseName = Downloader.sanitize(metadata.title);
  const ts = new Date().toISOString().slice(0, 10);

  const fmts = {
    markdown: { ext: 'md', mime: 'text/markdown', fn: Formatter.markdown },
    json: { ext: 'json', mime: 'application/json', fn: Formatter.json },
    html: { ext: 'html', mime: 'text/html', fn: Formatter.html },
    text: { ext: 'txt', mime: 'text/plain', fn: Formatter.text }
  };

  const f = fmts[format];
  if (!f) return;

  Downloader.save(f.fn(messages, metadata, platform), `${baseName}_${ts}.${f.ext}`, f.mime);
}

// ========== UI ==========
function createUI() {
  const platform = Platform.detect();

  GM_addStyle(`
    .aitk-btn{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;background:#fff;border:1px solid #ddd;cursor:pointer;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:all .2s;color:#333}
    .aitk-btn:hover{background:#f0f0f0;box-shadow:0 3px 12px rgba(0,0,0,.15)}
    .aitk-btn svg{fill:#333}
    .aitk-menu{position:fixed;top:45px;left:50%;transform:translateX(-50%);z-index:999999;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);display:none;min-width:200px;color:#333}
    .aitk-menu.show{display:block}
    .aitk-menu-section{padding:8px 12px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #eee;background:#fafafa}
    .aitk-menu-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:6px}
    .aitk-menu button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;border:none;background:#fff;cursor:pointer;font-size:11px;color:#333;border-radius:6px}
    .aitk-menu button:hover{background:#f0f0f0}
    .aitk-menu button .icon{font-size:18px}
    .aitk-menu hr{margin:0;border:none;border-top:1px solid #eee}
    .aitk-menu-edit{display:block;width:100%;padding:8px;border:none;background:#f5f5f5;cursor:pointer;font-size:11px;color:#666;text-align:center}
    .aitk-menu-edit:hover{background:#eee;color:#333}
  `);

  const btn = document.createElement('div');
  btn.className = 'aitk-btn';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z');
  svg.appendChild(path);
  btn.appendChild(svg);
  btn.appendChild(document.createTextNode(' 快樂工具人聊天小幫手'));

  const menu = document.createElement('div');
  menu.className = 'aitk-menu';

  // Helper function to create elements
  const el = (tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
  };

  // Export section
  const exportSection = el('div', 'aitk-menu-section', '匯出對話');
  menu.appendChild(exportSection);

  const exportGrid = el('div', 'aitk-menu-grid');
  const exports = [
    { fmt: 'markdown', icon: '📝', label: 'MD' },
    { fmt: 'json', icon: '📊', label: 'JSON' },
    { fmt: 'html', icon: '🌐', label: 'HTML' },
    { fmt: 'text', icon: '📄', label: 'TXT' }
  ];
  exports.forEach(ex => {
    const b = el('button');
    b.dataset.export = ex.fmt;
    const iconSpan = el('span', 'icon', ex.icon);
    b.appendChild(iconSpan);
    b.appendChild(document.createTextNode(ex.label));
    exportGrid.appendChild(b);
  });
  menu.appendChild(exportGrid);

  menu.appendChild(el('hr'));

  const actionSection = el('div', 'aitk-menu-section', '快捷指令');
  menu.appendChild(actionSection);

  const actionGrid = el('div', 'aitk-menu-grid');
  const actions = QuickAction.getActions();
  actions.forEach(a => {
    const b = el('button');
    b.dataset.action = a.id;
    b.dataset.prompt = encodeURIComponent(a.prompt);
    const iconSpan = el('span', 'icon', a.icon);
    b.appendChild(iconSpan);
    b.appendChild(document.createTextNode(a.label));
    actionGrid.appendChild(b);
  });
  menu.appendChild(actionGrid);

  const editBtn = el('button', 'aitk-menu-edit', '⚙️ 編輯指令');
  editBtn.dataset.edit = 'true';
  menu.appendChild(editBtn);
  document.body.appendChild(btn);
  document.body.appendChild(menu);

  btn.onclick = () => menu.classList.toggle('show');

  menu.onclick = e => {
    const target = e.target.closest('button');
    if (!target) return;

    const exportFmt = target.dataset.export;
    const actionId = target.dataset.action;
    const isEdit = target.dataset.edit;

    if (exportFmt) {
      exportChat(exportFmt);
    } else if (isEdit) {
      QuickAction.showEditor();
    } else if (actionId) {
      const prompt = decodeURIComponent(target.dataset.prompt || '');
      if (prompt) QuickAction.sendMessage(platform, prompt);
    }

    menu.classList.remove('show');
  };

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('show');
  });
}

// ========== Init ==========
function init() {
  if (!Platform.detect()) return;
  if (document.querySelector('.aitk-btn')) return; // 避免重複
  createUI();
  GM_registerMenuCommand('Export Markdown', () => exportChat('markdown'));
  GM_registerMenuCommand('Export JSON', () => exportChat('json'));
  GM_registerMenuCommand('Export HTML', () => exportChat('html'));
  GM_registerMenuCommand('Export Text', () => exportChat('text'));
}

// 立即嘗試 + 延遲重試（給 Gemini 這種慢載入的）
init();
setTimeout(init, 1000);
setTimeout(init, 3000);

})();