# 快樂工具人：AI 對話小幫手 (GPT/Gemini)

> 在 ChatGPT 與 Gemini 提供對話時間軸、Markdown／HTML 匯出與可自訂的快速追問。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2026--09--08.002-blue.svg)](ai-chat-toolkit.user.js)

## 功能

- 支援 **ChatGPT**、**Gemini**；不支援 Claude、Grok。
- 右下角浮動按鈕，按一下展開；可直接拖曳到不遮住畫面的地方，位置會記住。
- 對話時間軸預設展開，列出每一則提問；點擊可跳到原始訊息，也可以關閉。
- 匯出 **Markdown**：適合筆記、GitHub 與文件系統。
- 匯出 **HTML**：獨立可開啟的閱讀頁，有側邊對話索引及淺／深色模式。
- 快速追問只會填入輸入框，**不會自動送出**。
- 可編輯自訂快速指令、還原預設值，並保留中／英文介面切換。

## 安裝

1. 安裝 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)。
2. 點擊 [安裝此腳本](https://raw.githubusercontent.com/luhaoming/userscripts/main/ai-chat-toolkit/ai-chat-toolkit.user.js)。
3. 開啟 ChatGPT 或 Gemini 對話頁面，右下角會出現快樂工具人圖示。

若使用新版 Chrome + Tampermonkey，請到擴充功能設定確認 Tampermonkey 已啟用「允許使用者指令碼」。

## 使用方式

### 浮動選單與時間軸

- 點擊右下角圖示開啟選單。
- 拖曳圖示即可移動位置。
- 時間軸預設在右下角展開；從選單按「隱藏對話時間軸」可收起，之後可再顯示。
- 對話更新時，開啟中的時間軸會自動更新。

### 匯出對話

| 格式 | 用途 |
| --- | --- |
| Markdown | 保留標題、程式碼區塊、清單、表格、連結等常見格式。 |
| HTML | 單一檔案閱讀頁，含對話索引、響應式版面與淺／深色模式。 |

匯出的是目前已載入頁面上的對話內容；很長的舊對話請先捲動，讓平台把內容載入完成。

### 自訂快速指令

選單中的「自訂指令」可編輯快速追問。每行一個指令：

```text
圖示 | 標籤 | 要填入的指令
```

例如：

```text
🔍 | 查資料 | 請幫我查詢上面提到的技術與官方文件
📧 | 改寫信件 | 請把上面的內容改寫成正式商務信件
```

設定儲存在該瀏覽器的腳本管理器中；可按「還原預設」回復內建指令。

### 語系

選單的「切換語系」可在繁體中文與英文間切換。切換結果會保留。

## 支援狀態

| 平台 | 匯出 | 快速指令 | 時間軸 |
| --- | --- | --- | --- |
| ChatGPT | ✅ | ✅ | ✅ |
| Gemini | ✅ | ✅ | ✅ |
| Claude | ❌ | ❌ | ❌ |
| Grok | ❌ | ❌ | ❌ |

ChatGPT 與 Gemini 的頁面結構可能隨官方更新而改變。腳本已為 ChatGPT 加入 selector fallback；若按鈕出現但內容抓不到，請附上網址類型與畫面資訊至 [Issues](https://github.com/luhaoming/userscripts/issues)。

## 常見問題

### 按鈕沒有出現

確認腳本已啟用、目前網址是 ChatGPT 或 Gemini，然後重新整理頁面。也請確認 Tampermonkey 已取得該網站的網站存取權。

### 快速指令按了沒有送出

這是設計如此。它只會填入輸入框，讓你確認後自行送出，避免誤送。

### 為什麼匯出內容不完整

平台通常會延遲載入很長的對話。先將對話捲到需要保留的部分，再執行匯出。

## 授權

[MIT](../LICENSE)
