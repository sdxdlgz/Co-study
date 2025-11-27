# Co-Study Deployment Guide | 部署指南

[English](#english) | [中文](#中文)

---

## English

### VPS Deployment Steps

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (18.x or higher recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install certbot (for SSL certificates)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Clone and Deploy

```bash
# Clone project
cd /var/www
sudo git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# Install dependencies
sudo npm install

# Start with PM2
sudo pm2 start ecosystem.config.js
sudo pm2 save
sudo pm2 startup
```

#### 3. Configure Nginx Reverse Proxy

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/co-study

# Edit config file, replace your-domain.com with your actual domain
sudo nano /etc/nginx/sites-available/co-study

# Create symlink
sudo ln -s /etc/nginx/sites-available/co-study /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 4. Configure SSL Certificate (Let's Encrypt)

```bash
# Request SSL certificate for your domain
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and enable HTTPS
# Certificate will auto-renew
```

#### 5. Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 6. Environment Variables (Optional)

```bash
# Set custom port (default: 3000)
export PORT=3000

# For PM2, edit ecosystem.config.js:
# env: { PORT: 3000 }
```

### About WebRTC Ports

This application uses **peer-to-peer WebRTC** with Google's public STUN servers for NAT traversal. In most cases, you **don't need to open additional UDP ports** because:

- STUN only helps peers discover their public IP/port
- Media flows directly between browsers (P2P)
- ICE candidates negotiate the best connection path automatically

**When connections fail:**

If users behind strict NAT/firewalls can't connect, consider setting up a TURN relay server:

```bash
# Option 1: Use a public TURN service (coturn, Twilio, Xirsys)
# Option 2: Self-host coturn server

# Example coturn installation:
sudo apt install coturn
# Configure /etc/turnserver.conf with your credentials
```

### Daily Maintenance

```bash
# Check application status
pm2 status

# View logs
pm2 logs co-study

# Restart application
pm2 restart co-study

# Update code
cd /var/www/Co-study
sudo git pull
sudo npm install
pm2 restart co-study
```

### Domain Configuration

1. Add an A record at your domain provider pointing to your VPS IP
2. Wait for DNS propagation (usually 10-30 minutes)
3. Request SSL certificate with certbot
4. Access https://your-domain.com

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Video not working | Ensure HTTPS is properly configured; WebRTC requires secure context |
| Connection refused | Check if PM2 is running: `pm2 status` |
| 502 Bad Gateway | Verify Node.js app is running on correct port |
| Users can't connect video | Check if both users are on networks that allow P2P; consider TURN server |
| High latency | Server location matters for signaling; consider CDN or edge deployment |

### Notes

- WebRTC requires HTTPS for camera/microphone permissions
- Ensure server has sufficient bandwidth for signaling (video is P2P)
- Configure PM2 monitoring and auto-restart
- Keep system and dependencies updated regularly

---

## 中文

### VPS 部署步骤

#### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (推荐 18.x 或更高版本)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2 (进程管理器)
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx

# 安装 certbot (用于 SSL 证书)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. 克隆并部署项目

```bash
# 克隆项目
cd /var/www
sudo git clone https://github.com/sdxdlgz/Co-study.git
cd Co-study

# 安装依赖
sudo npm install

# 使用 PM2 启动应用
sudo pm2 start ecosystem.config.js
sudo pm2 save
sudo pm2 startup
```

#### 3. 配置 Nginx 反向代理

```bash
# 复制 nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/co-study

# 编辑配置文件，替换 your-domain.com 为你的实际域名
sudo nano /etc/nginx/sites-available/co-study

# 创建软链接
sudo ln -s /etc/nginx/sites-available/co-study /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 4. 配置 SSL 证书 (Let's Encrypt)

```bash
# 为你的域名申请 SSL 证书
sudo certbot --nginx -d your-domain.com

# Certbot 会自动配置 Nginx 并启用 HTTPS
# 证书会自动续期
```

#### 5. 防火墙配置

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 6. 环境变量配置（可选）

```bash
# 设置自定义端口（默认: 3000）
export PORT=3000

# 对于 PM2，编辑 ecosystem.config.js:
# env: { PORT: 3000 }
```

### 关于 WebRTC 端口

本应用使用 **点对点 WebRTC** 配合 Google 公共 STUN 服务器进行 NAT 穿透。大多数情况下，**不需要开放额外的 UDP 端口**，因为：

- STUN 只帮助客户端发现自己的公网 IP/端口
- 媒体流直接在浏览器之间传输（P2P）
- ICE 候选会自动协商最佳连接路径

**连接失败时的解决方案：**

如果用户在严格 NAT/防火墙后无法连接，考虑部署 TURN 中继服务器：

```bash
# 方案 1: 使用公共 TURN 服务 (coturn, Twilio, Xirsys)
# 方案 2: 自建 coturn 服务器

# coturn 安装示例:
sudo apt install coturn
# 在 /etc/turnserver.conf 中配置凭据
```

### 日常维护

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs co-study

# 重启应用
pm2 restart co-study

# 更新代码
cd /var/www/Co-study
sudo git pull
sudo npm install
pm2 restart co-study
```

### 域名配置

1. 在你的域名提供商那里添加 A 记录，指向你的 VPS IP
2. 等待 DNS 生效（通常 10-30 分钟）
3. 使用 certbot 申请 SSL 证书
4. 访问 https://your-domain.com 即可使用

### 故障排除

| 问题 | 解决方案 |
|------|----------|
| 视频不工作 | 确保 HTTPS 配置正确；WebRTC 需要安全上下文 |
| 连接被拒绝 | 检查 PM2 是否运行：`pm2 status` |
| 502 Bad Gateway | 确认 Node.js 应用在正确端口运行 |
| 用户无法视频连接 | 检查双方网络是否允许 P2P；考虑使用 TURN 服务器 |
| 高延迟 | 服务器位置影响信令传输；考虑 CDN 或边缘部署 |

### 注意事项

- WebRTC 需要 HTTPS 才能使用摄像头和麦克风
- 确保服务器有足够的带宽支持信令传输（视频是 P2P 直连）
- 建议配置 PM2 监控和自动重启
- 定期更新系统和依赖包

---

Made with ❤️ by [sdxdlgz](https://github.com/sdxdlgz)
