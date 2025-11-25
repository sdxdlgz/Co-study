# Co-Study 部署指南

## VPS 部署步骤

### 1. 服务器准备

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

### 2. 克隆并部署项目

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

### 3. 配置 Nginx 反向代理

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

### 4. 配置 SSL 证书 (Let's Encrypt)

```bash
# 为你的域名申请 SSL 证书
sudo certbot --nginx -d your-domain.com

# Certbot 会自动配置 Nginx 并启用 HTTPS
# 证书会自动续期
```

### 5. 防火墙配置

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 6. 重要：WebRTC 端口配置

由于这是 WebRTC 应用，需要确保以下端口开放：

```bash
# 开放 UDP 端口范围（用于 WebRTC 媒体传输）
sudo ufw allow 10000:20000/udp
```

如果使用的是云服务器（如阿里云、腾讯云），还需要在云控制台的安全组中开放这些端口。

## 日常维护

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

## 域名配置

1. 在你的域名提供商那里添加 A 记录，指向你的 VPS IP
2. 等待 DNS 生效（通常 10-30 分钟）
3. 使用 certbot 申请 SSL 证书
4. 访问 https://your-domain.com 即可使用

## 注意事项

- WebRTC 需要 HTTPS 才能正常工作（摄像头和麦克风权限）
- 确保服务器有足够的带宽支持视频通话
- 建议配置 PM2 监控和自动重启
- 定期更新系统和依赖包
