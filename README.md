# 🍭 糖果学拼音 (Candy Pinyin)

> **快乐学拼音，让学习像吃糖果一样甜！**  
> A cute and interactive app for children to learn Chinese Pinyin.

## 📖 项目简介 (Introduction)

**糖果学拼音** 是一款专为小学生（特别是低年级女生）设计的趣味拼音学习 Web 应用。应用采用粉嫩可爱的“糖果风”视觉设计，结合生动的交互动画和标准的发音，旨在消除孩子对枯燥拼音学习的抵触情绪，让学习过程变得轻松愉快。

### ✨ 核心亮点

*   **🎨 沉浸式糖果UI**: 采用马卡龙色系（粉、紫、蓝绿），搭配波点背景和果冻质感的 3D 按钮，视觉风格软萌可爱。
*   **🔊 纯正发音**: 覆盖 **声母 (Initials)**、**韵母 (Finals)** 和 **整体认读音节 (Overall)**，点击即读。
*   **🎮 趣味闯关**: 内置“听音辨字”小游戏，通过游戏化的方式检验学习成果，答对还有缤纷的彩带 (Confetti) 奖励！
*   **⚡ 智能缓存**: 利用 Vercel Blob 和浏览器双重缓存机制，不仅节省流量，还能实现秒级音频加载。
*   **📱 移动端优化**: 针对 iPad 和手机优化触控体验，解决了 iOS 设备音频自动播放和滚动回弹等常见问题。

---

## 🛠️ 技术栈 (Tech Stack)

本项目使用现代前端技术构建，注重性能与开发体验：

*   **Core**: [React 18](https://react.dev/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Typography**: Google Fonts (ZCOOL KuaiLe 用于标题, Nunito 用于拼音显示)
*   **Audio Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (Serverless Storage)
*   **Effects**: Canvas Confetti (庆祝特效)

---

## 📂 项目结构 (Structure)

```text
├── index.html              # 入口文件 (含字体与样式重置)
├── index.tsx               # React 挂载点
├── App.tsx                 # 主应用逻辑 (路由与状态管理)
├── constants.ts            # 拼音数据字典 (声母、韵母列表)
├── types.ts                # TypeScript 类型定义
├── api/
│   └── tts.ts              # Serverless Function: 音频获取与缓存代理
├── components/
│   ├── PinyinCard.tsx      # 拼音卡片组件 (含播放逻辑与果冻动画)
│   └── QuizGame.tsx        # 测验游戏组件 (听力测试逻辑)
├── services/
│   └── geminiService.ts    # 前端音频服务 (播放控制、iOS解锁、缓存管理)
└── ...
```

---

## 🚀 快速开始 (Getting Started)

### 1. 环境准备
确保本地已安装 [Node.js](https://nodejs.org/) (推荐 v18+)。

### 2. 安装依赖
```bash
npm install
```

### 3. 环境变量 (Vercel Blob)
本项目使用了 Vercel Blob 进行音频缓存。如果在本地运行 API 功能，你需要连接到 Vercel 项目并拉取环境变量，或者配置 `.env.local`：

```bash
# 获取 Vercel Blob 凭证 (需先安装 Vercel CLI)
vercel link
vercel env pull .env.local
```

### 4. 启动开发服务器
由于项目包含 Serverless API (`api/tts.ts`)，推荐使用 Vercel CLI 启动以支持 API 路由：

```bash
vercel dev
```
或者仅启动前端 (API 调用可能会失败):
```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`。

---

## 🎵 音频处理机制 (Audio Architecture)

为了保证音频的稳定性和加载速度，本项目设计了一套三级音频获取策略：

1.  **浏览器内存缓存**: 前端 `geminiService.ts` 维护一个 `Map`，已加载过的音频直接从内存播放，零延迟。
2.  **Vercel Blob 云端缓存**: 当请求新的拼音时，API 会优先检查 Vercel Blob 存储桶中是否已有生成的 MP3 文件。
3.  **外部源回源**: 如果缓存未命中，服务器会从第三方拼音库抓取音频，**自动转存**至 Vercel Blob，供下次快速访问。

> **注意**: 针对 iOS Safari 的自动播放限制，项目中包含了一个 `unlockAudio` 机制，在用户第一次交互时播放静音片段以“唤醒”音频引擎。

---

## 🎨 设计细节

*   **字体选择**:
    *   中文标题使用 **ZCOOL KuaiLe (快乐体)**，这是一种充满童趣的字体。
    *   拼音字母使用 **Nunito**，因为它的 `a` 和 `g` 的字形是单层结构，符合小学拼音教学标准（而非双层结构的 Times New Roman 风格）。
*   **动效**:
    *   卡片点击时有类似果冻按压的 `scale` 和 `translate` 效果。
    *   播放音频时卡片会有 `✨` 闪烁动画。
    *   游戏答对时触发全屏礼花。

---

## 📝 许可证

MIT License. Designed with ❤️ for kids.
