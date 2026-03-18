export async function onRequest(context) {
  const { request, env } = context;

  // 1. 處理 CORS 預檢
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // 2. 只處理 POST
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 3. 從環境變數讀取金鑰
    const API_KEY = env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("Cloudflare 專案尚未設定 GEMINI_API_KEY 環境變數！");
    }

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    // 4. 轉發請求給 Google Gemini
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });

    const data = await response.json();

    // 5. 回傳結果
    return new Response(JSON.stringify(data), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
