# Co-Study <img src="images/baby-chick_1f424.gif" width="32" height="32" alt="Logo">

[English](./README.md)

一个支持多人视频连线的在线自习室应用，帮助你和朋友一起专注学习。

## ✨ 功能特性

- 🎥 **多人视频通话** - 基于 WebRTC 的实时视频连线，支持多用户同时在线
- ⏰ **番茄钟计时器** - 专注/休息模式自动切换，可自定义时长
- 📊 **今日专注统计** - 自动统计每日专注时长，次日自动重置
- 📋 **待办事项清单** - 支持优先级标记和拖拽排序
- 💬 **实时聊天** - 房间内成员实时文字聊天
- 🔄 **状态共享** - 与房间成员共享你的学习/工作/休息状态
- 🎵 **环境音效** - 雨声、森林、篝火、咖啡厅、海浪等多种白噪音
- 🤖 **AI 专注监控** - 使用浏览器 FaceDetector API 检测是否离席
- 🌍 **多语言支持** - 中文/English 一键切换
- 🎨 **主题定制** - 深色/浅色模式 + 5 种主题配色

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# 安装依赖
npm install

# 启动 HTTP 服务器（用于开发）
npm start

# 或启动 HTTPS 服务器（用于测试 WebRTC）
npm run https
```

访问 `http://localhost:3000` 或 `https://localhost:3000`

> **注意**: WebRTC 视频功能在 HTTPS 或 localhost 环境下才能正常使用

### VPS 部署

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细的部署指南。

## 🛠️ 技术栈

- **前端**: 原生 JavaScript + HTML5 + CSS3（无框架依赖）
- **后端**: Node.js + Express + Socket.IO
- **实时通信**: WebRTC (Perfect Negotiation) + Socket.IO 信令
- **AI 检测**: 浏览器 FaceDetector API
- **进程管理**: PM2
- **反向代理**: Nginx

## 📝 使用说明

1. **加入房间** - 输入昵称和房间号（可自动生成）
2. **开启视频** - 点击"开启摄像头"与房间成员视频连线
3. **专注学习** - 使用番茄钟计时，记录今日专注时长
4. **管理任务** - 添加待办事项，设置优先级，拖拽排序
5. **设置状态** - 选择预设状态或自定义，可选择是否共享给房间
6. **环境音效** - 选择喜欢的白噪音帮助专注

## 🔒 隐私说明

- 所有视频通话都是点对点（P2P）连接，媒体数据不经过服务器
- 服务器仅用于信令交换和房间状态同步
- 关闭摄像头后，其他用户将无法看到你的画面
- 本地数据（设置、统计）存储在浏览器 localStorage 中

## 📁 项目结构

```
Co-study/
├── index.html          # 前端页面（单文件，包含 HTML/CSS/JS）
├── server.js           # HTTP 服务器（生产环境）
├── server-https.js     # HTTPS 服务器（开发测试）
├── audio/              # 环境音效文件
├── images/             # 图片资源
├── DEPLOYMENT.md       # 部署指南
└── README.md           # 项目说明
```

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ by [sdxdlgz](https://github.com/sdxdlgz)
