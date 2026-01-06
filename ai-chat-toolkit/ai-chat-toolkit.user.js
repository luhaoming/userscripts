// ==UserScript==
// @name        AI Chat Toolkit (Export + Quick Actions)
// @name:zh-TW  AI 對話工具箱 (匯出 + 快捷指令)
// @description Export chat to MD/JSON/HTML/TXT + quick actions for ChatGPT/Gemini/Grok/Claude
// @description:zh-TW AI 對話匯出與快捷指令工具箱
// @namespace   ai-chat-toolkit
// @version     2025-01-06.001
// @author      Enhanced by Claude
// @icon        data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a9eff"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2zm0 4h12v2H3v-2zm0-8h12v2H3V7z"/></svg>
// @match       *://chatgpt.com/*
// @match       *://chat.openai.com/*
// @match       *://grok.com/*
// @match       *://gemini.google.com/*
// @match       *://claude.ai/*
// @noframes
// @license     MIT
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// ==/UserScript==

(function() {
'use strict';

const VERSION = '2025-01-06.001';

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
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
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
        pre.innerHTML = `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
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
const QuickAction = {
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
      // 嘗試按 Enter 送出
      const enterEvent = new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 });
      box.dispatchEvent(enterEvent);
      
      // 備用：找送出按鈕
      const sendBtn = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="送出"]');
      if (sendBtn && !sendBtn.disabled) sendBtn.click();
    }, 100);

    return true;
  },

  actions: [
    { id: 'summary', icon: '📋', label: '摘要對話', prompt: '請用一句話摘要上面的對話紀錄' },
    { id: 'continue', icon: '➡️', label: '繼續', prompt: '請繼續' },
    { id: 'translate', icon: '🌐', label: '翻譯中文', prompt: '請將上面的回覆翻譯成繁體中文' },
    { id: 'simplify', icon: '✂️', label: '精簡回答', prompt: '請用更簡短的方式重新回答' },
    { id: 'explain', icon: '💡', label: '詳細解釋', prompt: '請更詳細地解釋上面的回答' }
  ]
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
    .aitk-btn{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;background:#fff;border:1px solid #ddd;cursor:pointer;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:all .2s}
    .aitk-btn:hover{background:#f0f0f0;box-shadow:0 3px 12px rgba(0,0,0,.15)}
    .aitk-menu{position:fixed;top:45px;left:50%;transform:translateX(-50%);z-index:999999;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);display:none;min-width:180px}
    .aitk-menu.show{display:block}
    .aitk-menu-section{padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #eee}
    .aitk-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px}
    .aitk-menu button:hover{background:#f5f5f5}
    .aitk-menu hr{margin:0;border:none;border-top:1px solid #eee}
  `);

  const btn = document.createElement('div');
  btn.className = 'aitk-btn';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/></svg> 工具箱`;

  const menu = document.createElement('div');
  menu.className = 'aitk-menu';

  // Export section
  let menuHTML = `<div class="aitk-menu-section">匯出對話</div>
    <button data-export="markdown">📝 Markdown</button>
    <button data-export="json">📊 JSON</button>
    <button data-export="html">🌐 HTML</button>
    <button data-export="text">📄 Text</button>
    <hr><div class="aitk-menu-section">快捷指令</div>`;

  // Quick actions
  QuickAction.actions.forEach(a => {
    menuHTML += `<button data-action="${a.id}">${a.icon} ${a.label}</button>`;
  });

  menu.innerHTML = menuHTML;
  document.body.appendChild(btn);
  document.body.appendChild(menu);

  btn.onclick = () => menu.classList.toggle('show');

  menu.onclick = e => {
    const target = e.target.closest('button');
    if (!target) return;

    const exportFmt = target.dataset.export;
    const actionId = target.dataset.action;

    if (exportFmt) {
      exportChat(exportFmt);
    } else if (actionId) {
      const action = QuickAction.actions.find(a => a.id === actionId);
      if (action) QuickAction.sendMessage(platform, action.prompt);
    }

    menu.classList.remove('show');
  };

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('show');
  });
}

// ========== Init ==========
if (Platform.detect()) {
  createUI();
  GM_registerMenuCommand('Export Markdown', () => exportChat('markdown'));
  GM_registerMenuCommand('Export JSON', () => exportChat('json'));
  GM_registerMenuCommand('Export HTML', () => exportChat('html'));
  GM_registerMenuCommand('Export Text', () => exportChat('text'));
}

})();