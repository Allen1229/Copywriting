// ══════════════════════════════════════════════
// ALN-X 文案優化工作室 — Script
// ══════════════════════════════════════════════

// ── 狀態管理 ──
const state = {
  tone: 'professional',
  apiKey: localStorage.getItem('copywriting_api_key') || '',
};

// ── DOM 元素 ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const inputText     = $('#input-text');
const btnOptimize   = $('#btn-optimize');
const btnCopy       = $('#btn-copy');
const btnClear      = $('#btn-clear');
const emptyState    = $('#empty-state');
const loadingState  = $('#loading-state');
const resultContent = $('#result-content');
const resultBody    = $('#result-body');
const resultMeta    = $('#result-meta');
const settingsPanel = $('#settings-panel');
const settingsToggle= $('#settings-toggle');
const apiKeyInput   = $('#api-key-input');
const saveSettings  = $('#save-settings');

// ── 初始化 ──
function init() {
  if (state.apiKey) apiKeyInput.value = state.apiKey;

  inputText.addEventListener('input', updateOptimizeButton);

  $$('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => handleChipClick(btn));
  });

  btnOptimize.addEventListener('click', handleOptimize);
  btnCopy.addEventListener('click', handleCopy);
  btnClear.addEventListener('click', handleClear);

  settingsToggle.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
  });

  saveSettings.addEventListener('click', () => {
    state.apiKey = apiKeyInput.value.trim();
    localStorage.setItem('copywriting_api_key', state.apiKey);
    settingsPanel.style.display = 'none';
    showToast('✅ API Key 已儲存');
  });

  updateOptimizeButton();
}

// ── 選項處理 ──
function handleChipClick(btn) {
  const group = btn.dataset.group;
  $$(`.chip-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state[group] = btn.dataset.value;
}

// ── 按鈕狀態 ──
function updateOptimizeButton() {
  btnOptimize.disabled = !inputText.value.trim();
}

// ── 核心：文案優化 ──
async function handleOptimize() {
  const text = inputText.value.trim();
  if (!text) return;

  emptyState.style.display = 'none';
  resultContent.style.display = 'none';
  loadingState.style.display = 'flex';
  btnOptimize.disabled = true;
  btnOptimize.innerHTML = `<span class="loading-spinner" style="width:20px;height:20px;border-width:2px;margin:0"></span> 優化中...`;

  try {
    const prompt = buildPrompt(text);
    const result = await callGemini(prompt);
    displayResult(result);
  } catch (err) {
    showToast(`❌ ${err.message}`);
    loadingState.style.display = 'none';
    emptyState.style.display = 'flex';
  } finally {
    btnOptimize.disabled = false;
    btnOptimize.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> 開始優化文案`;
    updateOptimizeButton();
  }
}

// ── Prompt 構建 ──
function buildPrompt(text) {
  const toneMap = {
    professional: '專業嚴謹 — 用詞精準、邏輯清晰、權威感強。適合 B2B 提案、產業分析或白皮書。',
    warm: '溫暖感性 — 語氣親切、有溫度、容易引起共鳴。適合品牌故事、生活風格或社群分享。',
    humorous: '幽默俏皮 — 語氣活潑、有趣、帶梗。適合年輕族群、創意廣告或社群互動。',
    aggressive: '強烈煽動 — 語氣緊迫、利益導向、行動力強。適合導購頁面或促銷活動。',
    concise: '簡潔有力 — 每一句都精準到位，沒有廢話。適合公告、通知或快節奏的溝通場景。',
    premium: '高級質感 — 語調沉穩內斂、用字精緻考究、營造品牌高級感。適合精品、奢華品牌或高端服務。',
    explanatory: '白話教學 — 語氣像老師在帶領學生，用最簡單直白的語言解釋事物。適合產品說明、教學引導或複雜內容的科普。',
  };

  return `你是一位資深華語文案編輯。請根據以下規則優化文案：

## 核心原則（最重要）
- **保留原文的核心意思、資訊和結構**，不要大幅改寫或加入原文沒有的內容。
- 你的工作是「潤飾」而非「重寫」，像一位細心的編輯在微調文字，而不是一位新作者。
- 原文的段落順序和主要論點必須維持。

## 優化方向
1. **去蕪存菁**：刪除贅字、冗詞與重複資訊，讓句子更流暢精煉。
2. **語氣校準**：將語氣調整為「${toneMap[state.tone]}」。
3. **節奏優化**：適當調整斷句和標點，讓閱讀節奏更好。
4. **用詞升級**：在不改變原意的前提下，替換更精準或更有力的詞彙。

## 輸出格式
直接輸出優化後的完整文案，不要加任何說明或前綴。
在文案最後加上分隔線「---」，然後用 3-5 個 bullet point（• 開頭）簡述你調整了什麼。

## 原始文案
${text}`;
}

// ── Gemini API 呼叫（自動偵測模式）──
// 有 API Key → 直接呼叫 Gemini（本地測試）
// 沒有 API Key → 走 /proxy 代理（Cloudflare 部署）
async function callGemini(prompt) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096,
    },
  };

  let url;
  if (state.apiKey) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;
  } else {
    url = '/proxy';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `API 錯誤 (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI 未返回有效結果');
  return text;
}

// ── 結果顯示 ──
function displayResult(text) {
  loadingState.style.display = 'none';
  resultContent.style.display = 'flex';

  const toneLabels = {
    professional: '專業嚴謹',
    warm: '溫暖感性',
    humorous: '幽默俏皮',
    aggressive: '強烈煽動',
    concise: '簡潔有力',
    premium: '高級質感',
    explanatory: '白話教學',
  };

  resultMeta.innerHTML = `<span class="result-tag tone">${toneLabels[state.tone]}</span>`;

  // 簡易 Markdown 渲染
  let html = text
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  resultBody.innerHTML = html;
  resultContent.style.animation = 'fadeIn 0.3s ease-out';
}

// ── 複製 ──
async function handleCopy() {
  const text = resultBody.innerText;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ 文案已複製到剪貼簿');
  } catch {
    showToast('❌ 複製失敗，請手動選取');
  }
}

// ── 清除 ──
function handleClear() {
  resultContent.style.display = 'none';
  emptyState.style.display = 'flex';
  resultBody.innerHTML = '';
  resultMeta.innerHTML = '';
}

// ── Toast 通知 ──
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── 啟動 ──
init();
