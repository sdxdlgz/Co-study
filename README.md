# Co-Study 📚

一个支持多人视频连线的在线自习室应用，帮助你和朋友一起专注学习。

## ✨ 功能特性

- 🎥 **多人视频通话** - 基于 WebRTC 的实时视频连线
- ⏰ **番茄钟计时器** - 专注模式和休息模式自动切换
- 📊 **实时状态共享** - 与房间成员共享你的学习状态
- 🎵 **环境音效** - 提供咖啡厅、雨声、森林等多种环境音
- 🤖 **AI 专注监控** - 使用 AI 监测你的专注状态
- 🌍 **多语言支持** - 支持中文和英文

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

### VPS 部署

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细的部署指南。

## 🛠️ 技术栈

- **前端**: 原生 JavaScript + HTML5 + CSS3
- **后端**: Node.js + Express + Socket.IO
- **实时通信**: WebRTC + Socket.IO
- **进程管理**: PM2
- **反向代理**: Nginx

## 📝 使用说明

1. 输入你的昵称和房间号加入房间
2. 允许浏览器访问摄像头和麦克风
3. 开始使用番茄钟专注学习
4. 与房间内的其他成员实时视频通话

## 🔒 隐私说明

- 所有视频通话都是点对点（P2P）连接
- 服务器仅用于信令交换，不存储或转发媒体数据
- 关闭摄像头后，其他用户将无法看到你的画面

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
