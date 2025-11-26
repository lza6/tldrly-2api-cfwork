# 📑 tldrly-2api (Cloudflare Worker 单文件完美版)

![项目版本](https://img.shields.io/badge/version-2.0.1-blue.svg)
![开源协议](https://img.shields.io/badge/license-Apache%202.0-green.svg)
[![部署到 Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com)

**代号: Chimera Synthesis - Final Fix**

> "在信息的洪流中，我们不是要建造更高的堤坝，而是要学会优雅地冲浪。这个项目，就是你的冲浪板。" —— 首席AI执行官

`tldrly-2api` 是一个神奇的工具，它像一座桥梁，将强大的网页/文本摘要服务 [tldrly.ai](https://tldrly.ai/) 无缝转换为主流、标准化的 OpenAI API 格式。你只需要一个 Cloudflare 账户，一键部署，就能拥有一个私人、免费、高效的摘要 API 服务。

无论是冗长的技术文档、深度的新闻报道，还是一篇复杂的学术论文，只需将 URL 或文本扔给它，它就能像一位博学的智者，为你提炼出核心要点，以流式对话的方式呈现在你面前。

---

## ✨ 项目亮点与特性

*   🚀 **一键部署** - 懒人福音！只需点击一个按钮，即可将整个服务部署到你自己的 Cloudflare 账户
*   💰 **零服务器成本** - 完全利用 Cloudflare 慷慨的免费套餐，无需服务器，没有账单焦虑
*   🔌 **标准化 API** - 完美模拟 OpenAI 的 `/v1/chat/completions` 接口，无缝对接主流 AI 应用
*   🧠 **智能识别** - 自动判断输入的是 URL 还是文本，URL 自动抓取网页正文
*   🌊 **流式输出** - 摘要内容像打字机一样逐字输出，带来丝滑流畅的实时体验
*   🧹 **网页净化** - 内置强大的网页内容清洗引擎，去除广告导航等无关元素
*   🔒 **安全可靠** - 代码完全开源，部署在你自己的账户下，确保隐私安全
*   🛠️ **开发者驾驶舱** - 提供简洁的 Web UI 界面，方便快速测试和管理

---

## 🚀 懒人一键部署教程 (1分钟搞定)

准备好了吗？让我们开始一场奇妙的数字炼金术，只需点几下鼠标，就能创造出属于你自己的 AI 摘要服务！

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lza6/tldrly-2api-cfwork)

### 部署流程图

```mermaid
graph TB
    A[🚀 点击部署按钮] --> B[🔐 登录 Cloudflare]
    B --> C[📝 授权 GitHub 访问]
    C --> D[💡 设置项目名称]
    D --> E[⚡ 开始部署]
    E --> F[🔑 设置 API_MASTER_KEY]
    F --> G[🎉 部署成功]
    
    style A fill:#ff6b6b,stroke:#333,stroke-width:2px
    style G fill:#51cf66,stroke:#333,stroke-width:2px
```

### 详细步骤

1.  **点击部署按钮**
    - 点击上方 "Deploy to Cloudflare Workers" 按钮
    - 这会引导你登录或注册 Cloudflare 账户

2.  **授权并设置项目**
    - 登录后，Cloudflare 会请求授权从 GitHub 拉取代码，点击"允许"
    - 为你的项目起一个你喜欢的名字，比如 `my-tldr-api`

3.  **部署**
    - 点击"部署"按钮，稍等片刻完成部署

4.  **设置安全密钥** ⚠️ **重要！**
    - 进入 Worker 管理页面
    - 找到 `设置` → `变量` → `环境变量`
    - 点击 `添加变量`:
        - 变量名称: `API_MASTER_KEY`
        - 变量值: 设置一个**你自己知道的复杂密码**，例如 `sk-aBcDeFgHiJkLmNoPqRsT`
    - 点击 `保存并部署`

5.  **大功告成！** 🎉
    - 返回 Worker 概览页面，获取你的 API 地址
    - 格式: `https://<你的项目名>.<你的子域>.workers.dev`

---

## 📖 详细使用指南

### 系统架构概览

```mermaid
flowchart LR
    A[🗣️ 用户请求] --> B[🌐 Cloudflare Worker]
    B --> C{🔍 内容识别}
    C -->|URL| D[🕷️ 网页抓取净化]
    C -->|文本| E[📝 直接处理]
    D --> F[🔐 生成数字指纹]
    E --> F
    F --> G[🔄 转换请求格式]
    G --> H[⚡ tldrly.ai API]
    H --> I[🌊 流式响应]
    I --> J[🔄 格式转换]
    J --> K[💬 OpenAI 格式输出]
    
    style A fill:#74c0fc,stroke:#333
    style B fill:#ffe066,stroke:#333
    style H fill:#ff922b,stroke:#333
    style K fill:#51cf66,stroke:#333
```

### 场景一：在支持 OpenAI 的客户端中使用

以 NextChat (V2) 为例：

1. 打开客户端的设置页面
2. 在 `模型提供商` 中选择 `OpenAI`
3. 将 **接口地址** 修改为你的 Worker 地址，并在末尾加上 `/v1`
   - 例如: `https://my-tldr-api.lza6.workers.dev/v1`
4. 将 **API Key** 填写为你自己设置的 `API_MASTER_KEY`
5. 在聊天界面，选择模型 `tldrly-summarizer` 或 `tldrly-auto`
6. 直接在对话框里发送网址，如 `https://www.bbc.com/news/technology-68740343`

### 场景二：通过 `curl` 直接调用

```bash
curl --location 'https://<你的项目名>.<你的子域>.workers.dev/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <你的API_MASTER_KEY>' \
--data '{
    "model": "tldrly-summarizer",
    "messages": [
        {
            "role": "user",
            "content": "https://www.theverge.com/2024/3/4/24090223/apple-m3-macbook-air-review"
        }
    ],
    "stream": true
}'
```

---

## 🧠 技术原理深度解析

### 核心工作原理

```mermaid
sequenceDiagram
    participant U as 用户
    participant W as Cloudflare Worker
    participant T as tldrly.ai
    participant Web as 目标网站

    U->>W: 📨 发送 OpenAI 格式请求
    Note over W: 🔍 解析请求内容
    alt 输入为 URL
        W->>Web: 🕷️ 抓取网页内容
        Web-->>W: 📄 返回 HTML
        W->>W: 🧹 内容净化处理
    else 输入为文本
        W->>W: 📝 直接处理文本
    end
    W->>W: 🔐 生成 SHA-256 签名
    W->>T: 🔄 转发格式化请求
    T-->>W: 🌊 流式返回摘要
    W->>W: 🎨 转换为 OpenAI 格式
    W-->>U: 💬 流式返回结果
```

### 技术栈架构

```mermaid
graph TB
    subgraph "🛠️ 技术栈层"
        A[Cloudflare Workers Runtime]
        B[JavaScript ES6+]
        C[Web APIs - Fetch, Streams]
        D[Crypto - SHA-256]
    end
    
    subgraph "🔧 核心模块"
        E[📡 API 路由网关]
        F[🕷️ 网页抓取器]
        G[🧹 内容净化器]
        H[🔐 签名生成器]
        I[🔄 流式转换器]
        J[🎨 格式适配器]
    end
    
    subgraph "🌐 外部依赖"
        K[tldrly.ai API]
        L[目标网站]
    end
    
    A --> B
    B --> C
    B --> D
    C --> E
    C --> F
    C --> I
    E --> F
    F --> G
    G --> H
    H --> J
    J --> K
    F --> L
```

### 关键组件详解

| 组件 | 图标 | 功能描述 | 技术要点 |
|------|------|----------|----------|
| **API 路由网关** | 📡 | 处理所有入站请求，进行认证和路由分发 | JWT 验证，RESTful 路由 |
| **网页抓取器** | 🕷️ | 智能抓取网页内容，支持动态页面 | Fetch API，请求头模拟 |
| **内容净化器** | 🧹 | 去除 HTML 噪音，提取纯净文本 | 正则表达式，DOM 解析 |
| **签名生成器** | 🔐 | 生成请求签名，确保数据完整性 | SHA-256 哈希算法 |
| **流式转换器** | 🔄 | 实时转换数据流格式 | TransformStream API |
| **格式适配器** | 🎨 | 标准化输出格式 | OpenAI API 规范 |

---

## ⚙️ 核心配置说明

### 环境变量配置

```javascript
// 核心配置对象
const CONFIG = {
    API_MASTER_KEY: process.env.API_MASTER_KEY || "1", // 🔑 安全密钥
    UPSTREAM_URL: "https://0.tldrly.ai/summarize",     // ⬆️ 上游API
    ORIGIN_URL: "https://chromewebstore.google.com",   // 🎭 来源伪装
    MODELS: [                                         // 🤖 模型列表
        "tldrly-summarizer",
        "tldrly-auto"
    ],
    SCRAPER_USER_AGENT: "Mozilla/5.0..."             // 🕶️ 用户代理
};
```

### 安全配置建议

```yaml
安全最佳实践:
  ✅ 使用强密码作为 API_MASTER_KEY
  ✅ 定期轮换 API 密钥
  ✅ 限制 Worker 的访问域名
  ✅ 启用 Cloudflare 的 WAF 防护
  ❌ 不要使用默认密钥 "1"
  ❌ 不要将密钥提交到代码仓库
```

---

## 🗺️ 未来发展与路线图

### 版本演进计划

```mermaid
timeline
    title tldrly-2api 发展路线图
    section 当前版本 v2.0.1
        核心功能闭环 : 完整的请求处理流程
        标准化接口 : OpenAI API 兼容
        基础网页抓取 : 静态内容支持
    section 近期规划 v2.1.x
        增强爬虫能力 : JS动态内容支持
        参数自定义 : 摘要长度/风格设置
        基础缓存 : KV存储集成
    section 中期目标 v2.5.x
        智能缓存 : 智能过期策略
        错误处理优化 : 友好错误提示
        监控仪表板 : 使用统计展示
    section 长期愿景 v3.0.0
        多引擎支持 : 可插拔摘要引擎
        高级功能 : 批量处理, 定时任务
        生态集成 : 主流应用深度集成
```

### 贡献指南

我们欢迎社区贡献！以下是主要的改进方向：

1. **🐛 Bug 修复** - 解决已知问题
2. **🚀 性能优化** - 提升响应速度
3. **🛡️ 安全增强** - 加强安全防护
4. **📚 文档完善** - 改进使用文档
5. **🌍 国际化** - 多语言支持

### 已知限制与解决方案

| 限制 | 影响 | 解决方案 |
|------|------|----------|
| 动态内容抓取 | 部分网站内容无法获取 | 集成 Puppeteer |
| 上游服务依赖 | tldrly.ai 不可用时服务中断 | 实现备用引擎 |
| 缓存机制缺失 | 重复请求消耗资源 | 集成 KV 存储 |
| 错误处理简单 | 用户体验不佳 | 细化错误分类 |

---

## 🔧 开发者资源

### 快速开始

```bash
# 克隆项目
git clone https://github.com/lza6/tldrly-2api-cfwork.git

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署到开发环境
wrangler dev
```

### API 文档

#### 获取模型列表
```http
GET /v1/models
Authorization: Bearer <your_api_key>
```

#### 创建聊天补全
```http
POST /v1/chat/completions
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
    "model": "tldrly-summarizer",
    "messages": [
        {
            "role": "user",
            "content": "https://example.com/article"
        }
    ],
    "stream": true
}
```

---

## 📜 开源协议

本项目采用 **Apache License 2.0** 开源协议。

**你可以自由地：**
- ✅ 商业使用
- ✅ 修改分发  
- ✅ 专利使用
- ✅ 私人使用

**你需要：**
- 📝 保留版权声明
- 📝 声明修改内容
- 📝 包含许可副本

**你不可以：**
- ❌ 使用商标
- ❌ 追究责任
- ❌ 附加额外限制

---

## 🎯 总结

`tldrly-2api` 不仅仅是一个技术项目，它代表了一种理念：**让复杂的技术变得简单可用**。通过将专业的摘要服务封装成熟悉的 OpenAI API 格式，我们打破了技术使用的壁垒，让每个人都能享受到 AI 带来的便利。

无论你是开发者、研究者，还是普通用户，这个项目都能为你提供价值。现在就部署属于你自己的摘要服务，开启高效的信息处理之旅吧！

**在信息的海洋中，愿你能更优雅地冲浪！** 🌊

---

*最后更新: 2025年11月26日 10:52:04 | 版本: 2.0.1 | 作者: [lza6](https://github.com/lza6)*

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ 支持一下！**

[![Star History Chart](https://api.star-history.com/svg?repos=lza6/tldrly-2api-cfwork&type=Date)](https://star-history.com/#lza6/tldrly-2api-cfwork&Date)

</div>
