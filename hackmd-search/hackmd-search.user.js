// ==UserScript==
// @name         HackMD 筆記快速搜尋
// @namespace    happy-toolman
// @version      3.8
// @description  實現 HackMD 筆記的秒級搜尋，支援增量同步、智慧管理與快樂工具人品牌識別。（本腳本之名稱與命名空間已固定，後續僅更新描述與版本）
// @author       快樂工具人
// @match        https://hackmd.io/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.hackmd.io
// @connect      hackmd.io
// @downloadURL  https://github.com/luhaoming/userscripts/raw/main/hackmd-search/hackmd-search.user.js
// @updateURL    https://github.com/luhaoming/userscripts/raw/main/hackmd-search/hackmd-search.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 配置與樣式分離 (CSS)
    // ==========================================
    const SEARCH_SHORTCUT = 's';
    let HACKMD_API_TOKEN = GM_getValue('hm_api_token', '');
    let searchData = GM_getValue('hm_search_index', []);
    let isIndexing = false, isPaused = false, stopRequest = false;

    GM_addStyle(`
        #hackmd-search-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.75); z-index: 99999; display: none; flex-direction: column; align-items: center; padding-top: 60px; backdrop-filter: blur(5px); transition: opacity 0.3s; }
        .hm-modal { width: 95%; max-width: 850px; background: #fff; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 85vh; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #edf2f7; }
        
        /* 標頭品牌 */
        .hm-brand-header { background: #f8fafc; padding: 12px 25px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; }
        .hm-brand-title { font-weight: 800; color: #1a202c; font-size: 14px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
        .hm-close-x { font-size: 24px; color: #cbd5e0; cursor: pointer; line-height: 1; transition: 0.2s; }
        .hm-close-x:hover { color: #1a202c; }

        /* 搜尋區 */
        .hm-search-bar { display: flex; align-items: center; padding: 15px 25px; border-bottom: 2px solid #f7fafc; background: #fff; gap: 15px; }
        .hm-input { flex: 1; padding: 10px 0; border: none; font-size: 18px; outline: none; background: transparent; color: #2d3748; }
        
        /* 按鈕樣式 */
        .hm-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 11px; font-weight: 700; color: #4a5568; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .hm-btn:hover { background: #f8fafc; transform: translateY(-1px); }
        .hm-btn-pause { color: #3182ce; border-color: #bee3f8; }
        .hm-btn-stop { color: #e53e3e; border-color: #feb2b2; }

        /* 結果列表 */
        .hm-results { flex: 1; overflow-y: auto; padding: 10px; background: #fff; min-height: 300px; }
        .hm-item { padding: 18px 25px; border-bottom: 1px solid #f8fafc; cursor: pointer; transition: all 0.2s; position: relative; }
        .hm-item:hover { background: #f8fafc; padding-left: 30px; }
        .hm-item-title { font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px; }
        .hm-item-tag { font-size: 11px; color: #10b981; font-weight: 700; }
        .hm-item-desc { font-size: 13px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; margin-top: 4px; }

        /* 進度條 */
        .hm-progress-box { padding: 15px 25px; background: #f8fafc; border-top: 1px solid #edf2f7; }
        .hm-bar-bg { height: 6px; width: 100%; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin: 8px 0; }
        .hm-bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #48bb78, #38a169); transition: width 0.3s; }
    `);

    // ==========================================
    // 2. 核心邏輯模組化 (Utilities)
    // ==========================================
    const Utils = {
        sleep: (ms) => new Promise(res => setTimeout(res, ms)),
        
        request: (options) => new Promise(res => {
            GM_xmlhttpRequest({ ...options, onload: r => res(r), onerror: e => res({ status: 500, error: e }) });
        }),

        sanitize: (text) => text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[\n\r\t]/g, ' ').substring(0, 5000),

        save: (dataMap) => {
            const sorted = Array.from(dataMap.values()).sort((a, b) => (b.m || 0) - (a.m || 0));
            searchData = sorted;
            GM_setValue('hm_search_index', sorted);
            const statusEl = document.getElementById('hm-data-status');
            if (statusEl) statusEl.innerText = `本地儲存: ${sorted.length} 篇`;
        }
    };

    // ==========================================
    // 3. UI 構建與事件
    // ==========================================
    function setupUI() {
        const overlay = document.createElement('div');
        overlay.id = 'hackmd-search-overlay';
        overlay.innerHTML = `
            <div class="hm-modal" onclick="event.stopPropagation()">
                <div class="hm-brand-header">
                    <div class="hm-brand-title">🚀 快樂工具人 筆記搜尋</div>
                    <div class="hm-close-x" id="hm-close-btn">×</div>
                </div>
                <div class="hm-search-bar">
                    <span>🔍</span>
                    <input type="text" id="hm-search-input" class="hm-input" placeholder="搜尋標題、內容... (輸入 :un 過濾未分類)">
                    <div style="text-align:right">
                        <button id="hm-index-btn" class="hm-btn">同步知識庫</button>
                        <div style="font-size:9px; color:#a0aec0; margin-top:2px"><input type="checkbox" id="hm-force-update"> 強制覆寫</div>
                    </div>
                </div>
                <div id="hm-search-results" class="hm-results"></div>
                <div id="hm-progress-container" class="hm-progress-box" style="display:none">
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:#718096">
                        <span id="hm-progress-text">準備同步...</span>
                        <span id="hm-progress-percent">0%</span>
                    </div>
                    <div class="hm-bar-bg"><div id="hm-progress-bar" class="hm-bar-fill"></div></div>
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <span id="hm-progress-stats" style="font-size:10px; color:#a0aec0">更新: 0 | 跳過: 0</span>
                        <div style="display:flex; gap:8px">
                            <button id="hm-pause-btn" class="hm-btn hm-btn-pause">暫停</button>
                            <button id="hm-stop-btn" class="hm-btn hm-btn-stop">停止</button>
                        </div>
                    </div>
                </div>
                <div style="padding:10px 25px; border-top:1px solid #f7fafc; font-size:10px; color:#cbd5e0; display:flex; justify-content:space-between">
                    <div>⌨️ Alt + ${SEARCH_SHORTCUT.toUpperCase()} | <span id="hm-setup-token" style="cursor:pointer; color:#3182ce; font-weight:700">⚙️ 設定 Token</span></div>
                    <div id="hm-data-status">本地儲存: ${searchData.length} 篇</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const fab = document.createElement('div');
        fab.id = 'hm-fab';
        fab.innerHTML = '🚀';
        fab.style = "position: fixed; bottom: 25px; right: 25px; width: 50px; height: 50px; background: #1e293b; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 99998; opacity: 0.6; font-size: 22px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); transition: 0.2s;";
        fab.onmouseover = () => { fab.style.opacity = '1'; fab.style.transform = 'scale(1.1) rotate(5deg)'; };
        fab.onmouseout = () => { fab.style.opacity = '0.6'; fab.style.transform = 'scale(1) rotate(0deg)'; };
        fab.onclick = () => toggleOverlay(true);
        document.body.appendChild(fab);

        document.getElementById('hm-close-btn').onclick = () => toggleOverlay(false);
        document.getElementById('hm-setup-token').onclick = setupToken;
        document.getElementById('hm-index-btn').onclick = buildIndex;
        document.getElementById('hm-search-input').oninput = (e) => doSearch(e.target.value);
        document.getElementById('hm-pause-btn').onclick = function() { isPaused = !isPaused; this.innerText = isPaused ? '繼續' : '暫停'; };
        document.getElementById('hm-stop-btn').onclick = () => stopRequest = true;
        overlay.onclick = () => toggleOverlay(false);
    }

    // ==========================================
    // 4. 功能實現
    // ==========================================

    function toggleOverlay(show) {
        const overlay = document.getElementById('hackmd-search-overlay');
        if (!overlay) return;
        overlay.style.display = show ? 'flex' : 'none';
        if (show) {
            const inputEl = document.getElementById('hm-search-input');
            inputEl.focus();
            doSearch(inputEl.value);
        }
    }

    function setupToken() {
        const token = prompt("🔑 輸入 HackMD API Token (設定後將自動儲存):", GM_getValue('hm_api_token', ''));
        if (token !== null) { GM_setValue('hm_api_token', token.trim()); location.reload(); }
    }

    function clearStorage() {
        if (confirm("🧹 確定要清除此名稱下的所有本地快取嗎？\n(包含 Token 與 搜尋索引，清除後需重新同步)")) {
            GM_setValue('hm_api_token', '');
            GM_setValue('hm_search_index', []);
            alert("✅ 清理完成！");
            location.reload();
        }
    }

    async function buildIndex() {
        if (!HACKMD_API_TOKEN) return alert('請先點擊下方的「⚙️ 設定 Token」！');
        if (isIndexing) return;
        isIndexing = true; stopRequest = false; isPaused = false;
        
        const indexBtn = document.getElementById('hm-index-btn');
        const progContainer = document.getElementById('hm-progress-container');
        progContainer.style.display = 'block';
        indexBtn.disabled = true;

        let updateCount = 0, skipCount = 0, removeCount = 0;
        let dataMap = new Map(searchData.map(item => [item.id, item]));

        try {
            const listRes = await Utils.request({ method: "GET", url: "https://api.hackmd.io/v1/notes", headers: { "Authorization": `Bearer ${HACKMD_API_TOKEN}` } });
            if (listRes.status !== 200) throw new Error('API 授權失敗，請檢查 Token');
            
            const notes = JSON.parse(listRes.responseText);
            const remoteIds = new Set(notes.map(n => n.id));

            for (let localId of dataMap.keys()) { if (!remoteIds.has(localId)) { dataMap.delete(localId); removeCount++; } }

            for (let i = 0; i < notes.length; i++) {
                while (isPaused && !stopRequest) await Utils.sleep(500);
                if (stopRequest) break;

                const note = notes[i];
                const localNote = dataMap.get(note.id);
                const isForce = document.getElementById('hm-force-update').checked;

                if (!isForce && localNote && localNote.m === note.lastChangedAt) {
                    skipCount++;
                } else {
                    const noteRes = await Utils.request({ method: "GET", url: `https://hackmd.io/${note.id}/download` });
                    if (noteRes.status === 200) {
                        dataMap.set(note.id, { id: note.id, t: note.title || '未命名', tags: Array.isArray(note.tags) ? note.tags.join(', ') : '', c: Utils.sanitize(noteRes.responseText), m: note.lastChangedAt });
                        updateCount++;
                    } else if (noteRes.status === 429) { await Utils.sleep(5000); i--; continue; }
                }

                document.getElementById('hm-progress-bar').style.width = `${Math.round(((i + 1) / notes.length) * 100)}%`;
                document.getElementById('hm-progress-percent').innerText = `${Math.round(((i + 1) / notes.length) * 100)}%`;
                document.getElementById('hm-progress-stats').innerText = `更新: ${updateCount} | 跳過: ${skipCount} | 移除: ${removeCount}`;
                if (updateCount > 0 && updateCount % 10 === 0) Utils.save(dataMap);
                await Utils.sleep(350);
            }

            Utils.save(dataMap);
            setTimeout(() => { progContainer.style.display = 'none'; indexBtn.disabled = false; }, 2000);
        } catch (e) { alert(e.message); } finally { isIndexing = false; }
    }

    function doSearch(query) {
        const results = document.getElementById('hm-search-results');
        if (!results) return;
        if (!query.trim()) {
            results.innerHTML = `<div style="text-align:center; color:#cbd5e1; padding:60px 20px;"><div style="font-size:40px;margin-bottom:10px">🚀</div>快樂工具人已就緒，目前本地共 ${searchData.length} 篇。</div>`;
            return;
        }
        
        const q = query.toLowerCase();
        let matches = (q === ':un') ? searchData.filter(i => !i.tags || i.tags.includes('未分類')) : searchData.filter(i => i.t.toLowerCase().includes(q) || i.tags.toLowerCase().includes(q) || i.c.toLowerCase().includes(q));

        results.innerHTML = matches.length ? '' : '<div style="text-align:center; color:#cbd5e1; padding:60px 20px;">無符合結果</div>';
        matches.slice(0, 30).forEach(item => {
            const div = document.createElement('div');
            div.className = 'hm-item';
            div.onclick = () => { window.location.href = `https://hackmd.io/${item.id}`; toggleOverlay(false); };
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <div class="hm-item-title">${item.t}</div>
                    <div style="font-size:10px; color:#94a3b8; font-weight:600; background:#f1f5f9; padding:2px 8px; border-radius:10px">${new Date(item.m).toLocaleDateString()}</div>
                </div>
                <div class="hm-item-tag"># ${item.tags || '未分類'}</div>
                <div class="hm-item-desc">${item.c.substring(0, 200)}...</div>
            `;
            results.appendChild(div);
        });
    }

    // --- 啟動 ---
    window.addEventListener('keydown', e => {
        if (e.altKey && e.key.toLowerCase() === SEARCH_SHORTCUT) { e.preventDefault(); toggleOverlay(document.getElementById('hackmd-search-overlay').style.display === 'none'); }
        if (e.key === 'Escape') toggleOverlay(false);
    });

    setupUI();
    GM_registerMenuCommand("🚀 設定 HackMD API Token", setupToken);
    GM_registerMenuCommand("🧹 清除本地快取 (Reset)", clearStorage);

})();