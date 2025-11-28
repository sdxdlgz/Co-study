# Co-Study <img src="images/baby-chick_1f424.gif" width="32" height="32" alt="Logo">

[中文文档](./README_CN.md)

A multi-user online study room with video chat, helping you and your friends stay focused together.

## ✨ Features

### Room Management
- 🏠 **Custom Room Names** - Create rooms with meaningful names like "TOEFL Prep" or "Study Group"
- 🔐 **Password Protection** - Secure your room with PBKDF2 encrypted passwords
- 🔗 **Easy Sharing** - Auto-generated 6-digit room codes for quick sharing
- 🚀 **Landing Page** - Beautiful fullpage scroll landing with create/join options

### Collaboration
- 🎥 **Multi-user Video Chat** - Real-time video connection via WebRTC, supports multiple users
- 💬 **Real-time Chat** - Text chat with room members, join/leave notifications
- 🔄 **Status Sharing** - Share your studying/working/break status with the room

### Productivity
- ⏰ **Pomodoro Timer** - Auto-switching between focus/break modes with sound notifications
- 📊 **Daily Focus Stats** - Track your daily focus time in minutes, auto-resets at midnight
- 📋 **To-Do List** - Priority labels (high/medium/low) and drag-to-reorder support

### Experience
- 🎵 **Ambient Sounds** - Rain, forest, fireplace, cafe, ocean waves
- 🤖 **AI Focus Monitor** - Detects if you're away using browser FaceDetector API
- 🌍 **Multi-language** - Switch between Chinese/English with one click
- 🎨 **Theme Customization** - Dark/light mode + 5 color themes
- 📱 **Responsive Design** - Works on desktop and mobile devices

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# Install dependencies
npm install

# Start HTTPS server (required for WebRTC)
npm start
```

Visit `https://localhost:3443` (accept the self-signed certificate warning)

> **Note**: WebRTC video features require HTTPS. The server auto-generates a self-signed certificate.

### VPS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide with Nginx + Let's Encrypt.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript + HTML5 + CSS3 (no framework)
- **Backend**: Node.js + Express + Socket.IO
- **Security**: PBKDF2 password hashing with crypto.timingSafeEqual
- **Real-time**: WebRTC (Perfect Negotiation) + Socket.IO signaling
- **HTTPS**: Self-signed certificates via selfsigned package
- **AI Detection**: Browser FaceDetector API
- **Process Manager**: PM2 (production)
- **Reverse Proxy**: Nginx (production)

## 📝 How to Use

1. **Create or Join** - Visit the landing page, create a new room or join with a code
2. **Set Password** (optional) - Protect your room with a password
3. **Share Room Code** - Send the 6-digit code to your study partners
4. **Enter Room** - Input your nickname to join the study space
5. **Enable Video** - Click "Enable camera" to video chat with room members
6. **Focus** - Use Pomodoro timer to track your focus time
7. **Manage Tasks** - Add to-dos, set priorities, drag to reorder
8. **Set Status** - Choose preset status or custom, sync with timer
9. **Ambient Sound** - Pick your favorite white noise to help focus

## 🔒 Privacy & Security

- All video calls are peer-to-peer (P2P), media never passes through server
- Room passwords are hashed with PBKDF2 (100,000 iterations, SHA-512)
- Password verification uses timing-safe comparison to prevent timing attacks
- Server only handles signaling and room state sync
- Disabling camera makes you invisible to others
- Local data (settings, stats) stored in browser localStorage
- Session persistence via cookies for seamless page refreshes

## 📁 Project Structure

```
Co-study/
├── landing.html        # Landing page (fullpage scroll, create/join)
├── index.html          # Study room page (video, timer, chat, todos)
├── server.js           # HTTPS server with self-signed cert
├── server-https.js     # Alternative HTTPS server
├── audio/              # Ambient sound files (.mp3, .wav)
├── images/             # Image assets (logo, etc.)
├── DEPLOYMENT.md       # VPS deployment guide
├── nginx.conf          # Nginx configuration example
├── ecosystem.config.js # PM2 configuration
└── README.md           # This file
```

## 🔧 Configuration

Environment variables:
- `PORT` - HTTP port (default: 3000)
- `HTTPS_PORT` - HTTPS port (default: 3443)

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

Made with ❤️ by [sdxdlgz](https://github.com/sdxdlgz)
