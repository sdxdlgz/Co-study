# Co-Study <img src="images/baby-chick_1f424.gif" width="32" height="32" alt="Logo">

[中文文档](./README_CN.md)

A multi-user online study room with video chat, helping you and your friends stay focused together.

## ✨ Features

- 🎥 **Multi-user Video Chat** - Real-time video connection via WebRTC, supports multiple users
- ⏰ **Pomodoro Timer** - Auto-switching between focus/break modes with customizable duration
- 📊 **Daily Focus Stats** - Track your daily focus time, auto-resets at midnight
- 📋 **To-Do List** - Priority labels and drag-to-reorder support
- 💬 **Real-time Chat** - Text chat with room members
- 🔄 **Status Sharing** - Share your studying/working/break status with the room
- 🎵 **Ambient Sounds** - Rain, forest, fireplace, cafe, ocean waves and more
- 🤖 **AI Focus Monitor** - Detects if you're away using browser FaceDetector API
- 🌍 **Multi-language** - Switch between Chinese/English with one click
- 🎨 **Theme Customization** - Dark/light mode + 5 color themes

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# Install dependencies
npm install

# Start HTTP server (for development)
npm start

# Or start HTTPS server (for WebRTC testing)
npm run https
```

Visit `http://localhost:3000` or `https://localhost:3000`

> **Note**: WebRTC video features only work on HTTPS or localhost

### VPS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript + HTML5 + CSS3 (no framework)
- **Backend**: Node.js + Express + Socket.IO
- **Real-time**: WebRTC (Perfect Negotiation) + Socket.IO signaling
- **AI Detection**: Browser FaceDetector API
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx

## 📝 How to Use

1. **Join a Room** - Enter nickname and room code (auto-generated if empty)
2. **Enable Video** - Click "Enable camera" to video chat with room members
3. **Focus** - Use Pomodoro timer to track your focus time
4. **Manage Tasks** - Add to-dos, set priorities, drag to reorder
5. **Set Status** - Choose preset status or custom, optionally share with room
6. **Ambient Sound** - Pick your favorite white noise to help focus

## 🔒 Privacy

- All video calls are peer-to-peer (P2P), media never passes through server
- Server only handles signaling and room state sync
- Disabling camera makes you invisible to others
- Local data (settings, stats) stored in browser localStorage

## 📁 Project Structure

```
Co-study/
├── index.html          # Frontend (single file with HTML/CSS/JS)
├── server.js           # HTTP server (production)
├── server-https.js     # HTTPS server (development)
├── audio/              # Ambient sound files
├── images/             # Image assets
├── DEPLOYMENT.md       # Deployment guide
└── README.md           # This file
```

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

Made with ❤️ by [sdxdlgz](https://github.com/sdxdlgz)
