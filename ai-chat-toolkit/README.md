# 快樂工具人：AI 對話匯出與快速範本 (GPT/Gemini/Grok/Claude)

> 🚀 一鍵匯出 AI 對話記錄 + 快捷指令工具箱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2025--01--06.030-blue.svg)](https://github.com/luhaoming/userscripts)

## 📖 簡介

AI Chat Toolkit 是一個強大的瀏覽器腳本，讓你輕鬆管理與 AI 對話。支援多平台、多格式匯出，還有自訂快捷指令功能！

### ✨ 主要功能

- **📥 多格式匯出** - 支援 Markdown、JSON、HTML、純文字
- **⚡ 快捷指令** - 內建常用指令，可自訂擴充
- **🌍 多語言介面** - 自動偵測語言（繁中/英文）
- **🎯 跨平台支援** - ChatGPT、Claude、Gemini、Grok

---

## 🎯 支援平台

| 平台 | 匯出對話 | 快捷指令 | 狀態 |
|------|---------|---------|------|
| **ChatGPT** | ✅ | ✅ | 完整支援 |
| **Claude** | ✅ | ✅ | 完整支援 |
| **Gemini** | ✅ | ✅ | 完整支援 |
| **Grok** | ✅ | ✅ | 完整支援 |

---

## 🚀 快速開始

### 安裝步驟

1. **安裝腳本管理器**（擇一即可）
   - [Tampermonkey](https://www.tampermonkey.net/) (推薦)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)

2. **安裝腳本**
   - 點擊 [安裝此腳本](https://greasyfork.org/scripts/561579)
   - 或前往 [GitHub](https://github.com/luhaoming/userscripts) 手動安裝

3. **開始使用**
   - 訪問任一支援的 AI 網站
   - 頁面頂部會出現工具按鈕

---

## 📖 使用說明

### 介面預覽

安裝完成後，在支援的 AI 網站頂部會出現：

```
┌─────────────────────────────┐
│  ☰ AI Chat Toolkit          │  ← 點擊展開選單
└─────────────────────────────┘
```

### 功能介紹

#### 1️⃣ **匯出對話**

支援四種格式：

| 格式 | 說明 | 適用場景 |
|------|------|---------|
| **📝 Markdown** | 包含完整格式、程式碼、數學公式 | 筆記、文檔、部落格 |
| **📊 JSON** | 結構化資料，含原始 HTML | 程式處理、資料分析 |
| **🌐 HTML** | 獨立網頁，可直接開啟 | 分享、存檔 |
| **📄 TXT** | 純文字版本 | 簡單記錄 |

**使用方式：**
1. 點擊頂部按鈕
2. 選擇「匯出對話」
3. 選擇格式
4. 自動下載檔案

#### 2️⃣ **快捷指令**

內建 6 個常用指令：

| 圖示 | 名稱 | 功能 |
|-----|------|------|
| 📋 | 摘要對話 | 一句話總結對話 |
| 🌐 | 翻譯 | 翻譯回覆內容 |
| ✂️ | 精簡回答 | 要求更簡短的回應 |
| 💡 | 詳細解釋 | 要求更詳細說明 |
| ⭕ | 繼續 | 快速回覆「繼續」 |
| ❌ | 不 | 快速回覆「不用」 |

**自訂指令：**
1. 點擊「⚙️ 編輯指令」
2. 按格式輸入：`icon | 名稱 | 指令內容`
3. 儲存並重新整理

範例：
```
🔍 | 查資料 | 請幫我在網路上搜尋相關資料
🎨 | 美化程式碼 | 請幫我重構這段程式碼，讓它更易讀
📧 | 寫信 | 請幫我改寫成正式的商業信件
```

---

## 🎨 截圖展示

### 主選單

![主選單](https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/screenshots/main-menu.png)

> 點擊按鈕後展開的選單，包含匯出和快捷指令

### 匯出格式選擇

![匯出選項](https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/screenshots/export-options.png)

> 四種格式可供選擇

### 快捷指令編輯器

![編輯器](https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/screenshots/editor.png)

> 自訂你的快捷指令

### Markdown 匯出範例

![Markdown 範例](https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/screenshots/markdown-output.png)

> 匯出的 Markdown 檔案，保留完整格式

---

## 🛠️ 進階功能

### 匯出格式細節

#### Markdown 格式
- ✅ 完整保留程式碼區塊（含語言標記）
- ✅ 數學公式支援（LaTeX）
- ✅ 表格、清單、連結
- ✅ 前置資料（Front Matter）
- ✅ 粗體、斜體、行內程式碼

#### JSON 格式
```json
{
  "metadata": {
    "title": "對話標題",
    "platform": "ChatGPT",
    "url": "原始網址",
    "exportedAt": "2025-01-06T12:00:00.000Z"
  },
  "messages": [
    {
      "role": "user",
      "content": {
        "text": "純文字內容",
        "markdown": "Markdown 格式"
      }
    }
  ]
}
```

#### HTML 格式
- ✅ 獨立網頁，無需額外檔案
- ✅ 程式碼語法高亮（highlight.js）
- ✅ 響應式設計
- ✅ 包含 metadata

---

## ⚙️ 設定與客製化

### 修改預設指令

編輯指令時使用以下格式：

```
icon | 標籤 | 提示詞內容
```

**範例：**
```
📝 | 寫摘要 | 請用 3 個重點摘要上面的內容
🔄 | 換個說法 | 請用不同的方式重新表達
🎯 | 抓重點 | 請只列出最關鍵的資訊
```

### 重設為預設值

點擊編輯器中的「重設預設」按鈕即可恢復初始設定。

---

## 🌐 多語言支援

腳本會自動偵測瀏覽器語言：

- **中文環境** (zh-*) → 顯示繁體中文介面
- **其他語言** → 顯示英文介面

*注意：快捷指令的提示詞可以自由混用任何語言*

---

## ❓ 常見問題

### Q: 為什麼按鈕沒有出現？

**A:** 請檢查：
1. 腳本管理器是否已啟用
2. 當前網站是否在支援列表中
3. 重新整理頁面

### Q: 匯出的檔案在哪裡？

**A:** 檔案會自動下載到瀏覽器預設的下載資料夾。

檔名格式：`對話標題_日期.副檔名`

### Q: 可以匯出歷史對話嗎？

**A:** 目前只能匯出當前開啟的對話。要匯出其他對話請先開啟該對話。

### Q: 快捷指令會儲存嗎？

**A:** 是的！自訂的指令會保存在瀏覽器本地，不會遺失。

### Q: 支援更多平台嗎？

**A:** 歡迎在 [GitHub Issues](https://github.com/luhaoming/userscripts/issues) 提出建議！

### Q: 匯出很慢怎麼辦？

**A:** 對話內容較多時需要較長處理時間，這是正常現象。

---

## 🔒 隱私與安全

- ✅ **完全本地執行** - 不會上傳任何資料
- ✅ **無需登入** - 不收集個人資訊
- ✅ **開源透明** - 原始碼完全公開
- ✅ **無追蹤** - 不含任何追蹤程式碼

所有資料處理都在你的瀏覽器本地完成，不會傳送到任何伺服器。

---

## 🐛 問題回報

遇到問題？請提供以下資訊：

1. **瀏覽器版本**（Chrome / Firefox / Edge 等）
2. **腳本管理器**（Tampermonkey / Violentmonkey 等）
3. **AI 平台**（ChatGPT / Claude / Gemini / Grok）
4. **錯誤描述**（越詳細越好）
5. **截圖**（如果可能）

回報方式：
- [GitHub Issues](https://github.com/luhaoming/userscripts/issues)
- [Greasyfork 回饋區](https://greasyfork.org/scripts/561579/feedback)

---

## 🤝 參與貢獻

歡迎任何形式的貢獻！

- 🐛 回報 Bug
- 💡 提出新功能建議
- 📖 改善文件
- 🌍 翻譯成其他語言
- 💻 提交 Pull Request

請前往 [GitHub](https://github.com/luhaoming/userscripts) 參與開發。

---

## 📝 版本歷史

### v2025-01-06.031 (最新)
- 🔗 加入 Greasyfork 官方連結
- 📝 更新文檔和安裝說明

### v2025-01-06.030
- ✨ 新增多語言支援（繁中/英文）
- ⚡ 優化程式碼，減少 10% 體積
- 🎨 改善編輯器 UI
- 🐛 修復跨平台顯示問題

### v2025-01-06.012
- ✨ 新增快捷指令功能
- ✨ 支援自訂指令
- 🎨 全新 UI 設計

### v2025-01-06.001
- 🎉 首次發布
- ✨ 支援四種匯出格式
- ✨ 支援四大 AI 平台

[查看完整版本記錄](https://github.com/luhaoming/userscripts/releases)

---

## 📄 授權

MIT License © 2025 快樂工具人 (Haoming Lu)

你可以自由地：
- ✅ 使用
- ✅ 修改
- ✅ 分發
- ✅ 商業使用

請保留原始授權聲明。

---

## 🙏 致謝

- 感謝所有使用者的回饋與建議
- 感謝 [Greasyfork](https://greasyfork.org/) 提供的平台
- 感謝所有開源社群的貢獻者

---

## 📮 聯絡方式

- 作者：快樂工具人 (Haoming Lu)
- GitHub：[@luhaoming](https://github.com/luhaoming)
- Email：（你的 email，可選）

---

## ⭐ 喜歡這個工具？

如果這個工具對你有幫助：

1. 在 [Greasyfork](https://greasyfork.org/scripts/561579) 給個好評 ⭐
2. 在 [GitHub](https://github.com/luhaoming/userscripts) 點個 Star ⭐
3. 分享給朋友 📢

你的支持是我持續更新的動力！

---

**最後更新：** 2025-01-06

