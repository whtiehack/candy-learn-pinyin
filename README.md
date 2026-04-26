# 🍭 糖果学拼音 (Candy Pinyin)

> **快乐学拼音，让学习像吃糖果一样甜！**  
> A cute and interactive app for children to learn Chinese Pinyin.

## 📖 项目简介 (Introduction)

**糖果学拼音** 是一款专为小学生（特别是低年级女生）设计的趣味拼音学习 Web 应用。应用采用粉嫩可爱的“糖果风”视觉设计，结合生动的交互动画和标准的发音，旨在消除孩子对枯燥拼音学习的抵触情绪，让学习过程变得轻松愉快。

### ✨ 核心亮点

*   **🎨 沉浸式糖果UI**: 采用马卡龙色系（粉、紫、蓝绿），搭配波点背景和果冻质感的 3D 按钮，视觉风格软萌可爱。
*   **🔊 纯正发音**: 覆盖 **声母 (Initials)**、**韵母 (Finals)** 和 **整体认读音节 (Overall)**，点击即读。
*   **🎮 趣味闯关**: 内置“听音辨字”小游戏，通过游戏化的方式检验学习成果，答对还有缤纷的彩带 (Confetti) 奖励！
*   **⚡ 本地音频**: 所有拼音音频文件随应用一起打包发布，无需外部依赖，离线可用，秒级加载。
*   **📱 移动端优化**: 针对 iPad 和手机优化触控体验，解决了 iOS 设备音频自动播放和滚动回弹等常见问题。

---

## 🛠️ 技术栈 (Tech Stack)

本项目使用现代前端技术构建，注重性能与开发体验：

*   **Core**: [React 18](https://react.dev/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Typography**: Google Fonts (ZCOOL KuaiLe 用于标题, Nunito 用于拼音显示)
*   **Audio**: 本地静态 MP3 文件 (`public/audio/`)
*   **Effects**: Canvas Confetti (庆祝特效)

---

## 📂 项目结构 (Structure)

```text
├── index.html              # 入口文件 (含字体与样式重置)
├── index.tsx               # React 挂载点
├── App.tsx                 # 主应用逻辑 (路由与状态管理)
├── constants.ts            # 拼音数据字典 (声母、韵母列表)
├── types.ts                # TypeScript 类型定义
├── public/
│   └── audio/              # 本地拼音 MP3 音频文件
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

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

---

## 🎵 音频处理机制 (Audio Architecture)

所有拼音音频以静态 MP3 文件的形式打包在 `public/audio/` 目录中，随应用一同部署，无需任何后端或外部存储服务。

1.  **静态文件直出**: 音频文件由 CDN/Pages 直接服务，加载速度极快。
2.  **浏览器内存缓存**: `geminiService.ts` 维护一个 `Map`，已加载过的音频直接从内存播放，零延迟。

> **注意**: 针对 iOS Safari 的自动播放限制，项目中包含了一个 `unlockAudio` 机制，在用户第一次交互时播放静音片段以”唤醒”音频引擎。

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
