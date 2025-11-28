# Co-Study <img src="images/baby-chick_1f424.gif" width="32" height="32" alt="Logo">

[English](./README.md)

一个支持多人视频连线的在线自习室应用，帮助你和朋友一起专注学习。

## ✨ 功能特性

### 房间管理
- 🏠 **自定义房间名称** - 创建有意义的房间名，如"考研英语组"、"周末自习"
- 🔐 **密码保护** - 使用 PBKDF2 加密算法保护你的自习室
- 🔗 **便捷分享** - 自动生成 6 位房间代码，方便快速分享
- 🚀 **精美落地页** - 全屏滚动设计，支持创建/加入房间

### 协作功能
- 🎥 **多人视频通话** - 基于 WebRTC 的实时视频连线，支持多用户同时在线
- 💬 **实时聊天** - 房间内成员实时文字聊天，加入/离开通知
- 🔄 **状态共享** - 与房间成员共享你的学习/工作/休息状态

### 效率工具
- ⏰ **番茄钟计时器** - 专注/休息模式自动切换，配有提示音
- 📊 **今日专注统计** - 以分钟为单位统计每日专注时长，次日自动重置
- 📋 **待办事项清单** - 支持优先级标记（高/中/低）和拖拽排序

### 使用体验
- 🎵 **环境音效** - 雨声、森林、篝火、咖啡厅、海浪
- 🤖 **AI 专注监控** - 使用浏览器 FaceDetector API 检测是否离席
- 🌍 **多语言支持** - 中文/English 一键切换
- 🎨 **主题定制** - 深色/浅色模式 + 5 种主题配色
- 📱 **响应式设计** - 支持桌面端和移动端

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# 安装依赖
npm install

# 启动 HTTPS 服务器（WebRTC 必需）
npm start
```

访问 `https://localhost:3443`（接受自签名证书警告）

> **注意**: WebRTC 视频功能需要 HTTPS 环境。服务器会自动生成自签名证书。

### VPS 部署

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取 Nginx + Let's Encrypt 的详细部署指南。

## 🛠️ 技术栈

- **前端**: 原生 JavaScript + HTML5 + CSS3（无框架依赖）
- **后端**: Node.js + Express + Socket.IO
- **安全**: PBKDF2 密码哈希 + crypto.timingSafeEqual 时序安全比较
- **实时通信**: WebRTC (Perfect Negotiation) + Socket.IO 信令
- **HTTPS**: selfsigned 包自动生成自签名证书
- **AI 检测**: 浏览器 FaceDetector API
- **进程管理**: PM2（生产环境）
- **反向代理**: Nginx（生产环境）

## 📝 使用说明

1. **创建或加入** - 访问落地页，创建新房间或输入代码加入
2. **设置密码**（可选） - 为你的自习室设置访问密码
3. **分享房间代码** - 将 6 位代码发送给你的学习伙伴
4. **进入房间** - 输入昵称即可加入学习空间
5. **开启视频** - 点击"开启摄像头"与房间成员视频连线
6. **专注学习** - 使用番茄钟计时，记录今日专注时长
7. **管理任务** - 添加待办事项，设置优先级，拖拽排序
8. **设置状态** - 选择预设状态或自定义，可同步计时器状态
9. **环境音效** - 选择喜欢的白噪音帮助专注

## 🔒 隐私与安全

- 所有视频通话都是点对点（P2P）连接，媒体数据不经过服务器
- 房间密码使用 PBKDF2 算法加密（100,000 次迭代，SHA-512）
- 密码验证使用时序安全比较，防止时序攻击
- 服务器仅用于信令交换和房间状态同步
- 关闭摄像头后，其他用户将无法看到你的画面
- 本地数据（设置、统计）存储在浏览器 localStorage 中
- 通过 Cookie 实现会话持久化，支持无缝刷新页面

## 📁 项目结构

```
Co-study/
├── landing.html        # 落地页（全屏滚动，创建/加入房间）
├── index.html          # 自习室页面（视频、计时器、聊天、待办）
├── server.js           # HTTPS 服务器（自签名证书）
├── server-https.js     # 备用 HTTPS 服务器
├── audio/              # 环境音效文件（.mp3, .wav）
├── images/             # 图片资源（logo 等）
├── DEPLOYMENT.md       # VPS 部署指南
├── nginx.conf          # Nginx 配置示例
├── ecosystem.config.js # PM2 配置
└── README.md           # 项目说明
```

## 🔧 配置选项

环境变量：
- `PORT` - HTTP 端口（默认：3000）
- `HTTPS_PORT` - HTTPS 端口（默认：3443）

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ by [sdxdlgz](https://github.com/sdxdlgz)
