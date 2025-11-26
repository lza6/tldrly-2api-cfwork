// =================================================================================
//  项目: tldrly-2api (Cloudflare Worker 单文件完美版)
//  版本: 2.0.1 (代号: Chimera Synthesis - Final Fix)
//  作者: 首席AI执行官 (Principal AI Executive Officer)
//  日期: 2025-11-26
//
//  [v2.0.1 修复日志]
//  1. [修复] 移除了重复的函数定义，解决了 "Expected 0-2 arguments" 错误。
//  2. [优化] 统一了错误响应格式，支持可选的错误代码。
//  3. [增强] 爬虫模块增加了对非标准 HTML 结构的容错性。
// =================================================================================

// --- [第一部分: 核心配置] ---
const CONFIG = {
  PROJECT_NAME: "tldrly-2api",
  PROJECT_VERSION: "2.0.1",
  
  // 安全配置 (建议在 Cloudflare 环境变量中设置 API_MASTER_KEY)
  API_MASTER_KEY: "1", 
  
  // 上游服务配置
  UPSTREAM_URL: "https://0.tldrly.ai/summarize",
  ORIGIN_URL: "chrome-extension://oghdgljdklhkkjflodnlobgldikibddf",
  
  // 模型列表
  MODELS: [
    "tldrly-summarizer",
    "tldrly-auto"
  ],
  DEFAULT_MODEL: "tldrly-summarizer",
  
  // 默认语言
  DEFAULT_LANGUAGE: "Chinese",

  // 爬虫配置
  SCRAPER_USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  SCRAPER_TIMEOUT: 15000 // 15秒超时
};

// --- [第二部分: Worker 入口] ---
export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    const url = new URL(request.url);

    // 1. 预检请求
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    // 2. 开发者驾驶舱 (Web UI)
    if (url.pathname === '/') {
      return handleUI(request, apiKey);
    } 
    // 3. API 路由
    else if (url.pathname.startsWith('/v1/')) {
      return handleApi(request, apiKey);
    } 
    // 4. 404
    else {
      return createErrorResponse(`路径未找到: ${url.pathname}`, 404, 'not_found');
    }
  }
};

// --- [第三部分: API 代理逻辑] ---

/**
 * API 路由分发
 */
async function handleApi(request, apiKey) {
  // 鉴权
  const authHeader = request.headers.get('Authorization');
  if (apiKey && apiKey !== "1") {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('需要 Bearer Token 认证。', 401, 'unauthorized');
    }
    const token = authHeader.substring(7);
    if (token !== apiKey) {
      return createErrorResponse('无效的 API Key。', 403, 'invalid_api_key');
    }
  }

  const url = new URL(request.url);
  const requestId = `req-${crypto.randomUUID()}`;

  if (url.pathname === '/v1/models') {
    return handleModelsRequest();
  } else if (url.pathname === '/v1/chat/completions') {
    return handleChatCompletions(request, requestId);
  } else {
    return createErrorResponse(`不支持的 API 路径: ${url.pathname}`, 404, 'not_found');
  }
}

/**
 * 处理 /v1/models
 */
function handleModelsRequest() {
  const modelsData = {
    object: 'list',
    data: CONFIG.MODELS.map(modelId => ({
      id: modelId,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'tldrly-2api',
    })),
  };
  return new Response(JSON.stringify(modelsData), {
    headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
  });
}

/**
 * 核心功能：网页抓取与清洗
 */
async function fetchUrlContent(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': CONFIG.SCRAPER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(CONFIG.SCRAPER_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`目标网页访问失败: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // --- 简易 HTML 清洗引擎 ---
    let text = html;
    
    // 移除无关标签
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, " ");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, " ");
    text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gim, " ");
    text = text.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gim, " ");
    text = text.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gim, " ");
    text = text.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gim, " ");
    
    // 替换块级元素为换行
    text = text.replace(/<\/(div|p|li|h[1-6]|tr)>/gim, "\n");
    text = text.replace(/<br\s*\/?>/gim, "\n");
    
    // 移除剩余标签
    text = text.replace(/<[^>]+>/g, " ");
    
    // 解码实体
    text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    
    // 压缩空白
    text = text.replace(/\s+/g, " ").trim();
    
    // 长度截断
    if (text.length > 50000) text = text.substring(0, 50000);
    if (text.length < 50) throw new Error("网页内容过少或无法提取有效文本。");

    return text;
  } catch (e) {
    throw new Error(`网页抓取失败: ${e.message}`);
  }
}

/**
 * 核心算法：生成 tldrly 所需的 SHA-256 签名
 */
async function generateSignature(content, language) {
  const signObj = {
    data: content,
    props: { language: language }
  };
  const jsonStr = JSON.stringify(signObj);
  const msgBuffer = new TextEncoder().encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 处理聊天请求
 */
async function handleChatCompletions(request, requestId) {
  try {
    const body = await request.json();
    const messages = body.messages || [];
    const lastMsg = messages.reverse().find(m => m.role === 'user');
    if (!lastMsg) throw new Error("未找到用户消息");
    
    let contentToSummarize = lastMsg.content.trim();
    const language = CONFIG.DEFAULT_LANGUAGE;

    // --- 智能判断：是 URL 还是 文本？ ---
    const urlRegex = /^(https?:\/\/[^\s]+)/i;
    const urlMatch = contentToSummarize.match(urlRegex);

    // 如果是 URL，先进行抓取
    if (urlMatch) {
      const targetUrl = urlMatch[1];
      contentToSummarize = await fetchUrlContent(targetUrl);
    }

    // 1. 计算签名
    const hash = await generateSignature(contentToSummarize, language);

    // 2. 构造上游 Payload
    const upstreamPayload = {
      data: contentToSummarize,
      props: {
        language: language,
        hash: hash
      }
    };

    // 3. 发送请求给 tldrly
    const response = await fetch(CONFIG.UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": CONFIG.ORIGIN_URL,
        "Referer": CONFIG.ORIGIN_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Priority": "u=1, i"
      },
      body: JSON.stringify(upstreamPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`上游服务错误 (${response.status}): ${errText}`);
    }

    // 4. 流式转换
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      // 如果刚才进行了抓取，先发送一个提示信息
      if (urlMatch) {
        const infoChunk = createChunk(requestId, body.model, `> **已成功抓取网页内容，正在生成摘要...**\n\n`);
        await writer.write(encoder.encode(infoChunk));
      }

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunkStr = decoder.decode(value, { stream: true });
          if (chunkStr) {
            const openAIChunk = createChunk(requestId, body.model, chunkStr);
            await writer.write(encoder.encode(openAIChunk));
          }
        }
        
        const endChunk = createChunk(requestId, body.model, "", "stop");
        await writer.write(encoder.encode(endChunk));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        const errChunk = createChunk(requestId, body.model, `\n\n[Error: ${e.message}]`, "stop");
        await writer.write(encoder.encode(errChunk));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: corsHeaders({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })
    });

  } catch (e) {
    return createErrorResponse(e.message, 500, 'internal_error');
  }
}

// --- 辅助函数 ---

function createChunk(id, model, content, finish_reason = null) {
  return `data: ${JSON.stringify({
    id: id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model || CONFIG.DEFAULT_MODEL,
    choices: [{
      index: 0,
      delta: content ? { content: content } : {},
      finish_reason: finish_reason
    }]
  })}\n\n`;
}

/**
 * 统一错误响应生成器
 * 修复了参数数量不匹配的问题，现在支持 2 或 3 个参数
 */
function createErrorResponse(message, status, code = 'api_error') {
  return new Response(JSON.stringify({
    error: { message, type: 'api_error', code }
  }), {
    status,
    headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
  });
}

function handleCorsPreflight() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function corsHeaders(headers = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// --- [第四部分: 开发者驾驶舱 UI] ---
function handleUI(request, apiKey) {
  const origin = new URL(request.url).origin;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.PROJECT_NAME} - 智能摘要</title>
    <style>
      :root { --bg: #121212; --panel: #1E1E1E; --text: #E0E0E0; --primary: #00E5FF; --accent: #2979FF; }
      body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; height: 100vh; display: flex; overflow: hidden; }
      .sidebar { width: 320px; background: var(--panel); border-right: 1px solid #333; padding: 20px; display: flex; flex-direction: column; }
      .main { flex: 1; display: flex; flex-direction: column; padding: 20px; }
      .box { background: #252525; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #333; }
      .label { font-size: 12px; color: #888; margin-bottom: 5px; display: block; }
      input, textarea { width: 100%; background: #333; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; box-sizing: border-box; }
      button { width: 100%; padding: 10px; background: var(--primary); border: none; border-radius: 4px; font-weight: bold; cursor: pointer; color: #000; margin-top: 10px; }
      button:hover { opacity: 0.9; }
      button:disabled { background: #555; cursor: not-allowed; }
      .chat-window { flex: 1; background: #000; border: 1px solid #333; border-radius: 8px; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
      .msg { max-width: 85%; padding: 12px 16px; border-radius: 8px; line-height: 1.6; font-size: 14px; }
      .msg.user { align-self: flex-end; background: #333; color: #fff; }
      .msg.ai { align-self: flex-start; background: #1a1a1a; border: 1px solid #333; width: 100%; max-width: 100%; }
      .msg.ai strong { color: var(--primary); }
      .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #888; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-right: 5px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2 style="margin-top:0">📑 ${CONFIG.PROJECT_NAME} <span style="font-size:12px;color:#888">v${CONFIG.PROJECT_VERSION}</span></h2>
        <div class="box">
            <span class="label">API Endpoint</span>
            <input type="text" value="${origin}/v1/chat/completions" readonly onclick="this.select()">
        </div>
        <div class="box">
            <span class="label">API Key</span>
            <input type="text" value="${apiKey}" readonly onclick="this.select()">
        </div>
        <div class="box">
            <span class="label">输入 URL 或 文本</span>
            <textarea id="prompt" rows="6" placeholder="例如: https://example.com/article 或 直接粘贴文章内容..."></textarea>
            <button id="btn" onclick="send()">开始摘要</button>
        </div>
        <div style="font-size:12px; color:#666; margin-top:auto;">
            支持自动抓取网页内容。<br>
            内置 SHA-256 签名计算。
        </div>
    </div>
    <div class="main">
        <div class="chat-window" id="chat">
            <div style="text-align:center; color:#666; margin-top:50px;">
                请输入 URL，AI 将自动访问并生成摘要。
            </div>
        </div>
    </div>
    <script>
        const API_KEY = "${apiKey}";
        const URL = "${origin}/v1/chat/completions";

        function appendMsg(role, text) {
            const div = document.createElement('div');
            div.className = 'msg ' + role;
            div.innerHTML = text;
            document.getElementById('chat').appendChild(div);
            div.scrollIntoView({behavior: "smooth"});
            return div;
        }

        async function send() {
            const input = document.getElementById('prompt');
            const val = input.value.trim();
            if (!val) return;
            
            const btn = document.getElementById('btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> 处理中...';
            
            if(document.querySelector('.chat-window').innerText.includes('请输入 URL')) {
                document.getElementById('chat').innerHTML = '';
            }

            appendMsg('user', val);
            const aiMsg = appendMsg('ai', '<span class="spinner"></span> 正在分析...');
            let fullText = "";

            try {
                const res = await fetch(URL, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: "${CONFIG.DEFAULT_MODEL}",
                        messages: [{role: "user", content: val}],
                        stream: true
                    })
                });

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                aiMsg.innerHTML = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, {stream: true});
                    const lines = chunk.split('\\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') break;
                            try {
                                const json = JSON.parse(jsonStr);
                                const content = json.choices[0].delta.content;
                                if (content) {
                                    fullText += content;
                                    // 简单的 Markdown 渲染
                                    aiMsg.innerHTML = fullText.replace(/\\n/g, '<br>');
                                    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
                                }
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {
                aiMsg.innerHTML += '<br><span style="color:#CF6679">Error: ' + e.message + '</span>';
            } finally {
                btn.disabled = false;
                btn.innerText = "开始摘要";
            }
        }
    </script>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
