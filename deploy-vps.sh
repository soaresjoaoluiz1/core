#!/bin/bash
# ================================================
# DROS Deploy Script — VPS Setup
# Run this on the VPS via SSH
# ================================================

echo "=== 1. INSTALLING NODE.JS 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

echo "=== 2. INSTALLING PM2 ==="
sudo npm install -g pm2

echo "=== 3. INSTALLING NGINX (if not installed) ==="
sudo apt-get install -y nginx

echo "=== 4. CREATING APP DIRECTORY ==="
sudo mkdir -p /var/www/dros
sudo chown $USER:$USER /var/www/dros
cd /var/www/dros

echo "=== 5. CLONING REPO (or pull if exists) ==="
# You'll need to set up the git repo first
# For now, create directory structure
mkdir -p client-dashboard crm-dashboard agency-hub

echo "=== 6. SETUP COMPLETE ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/dros/"
echo "2. Run: cd /var/www/dros/client-dashboard && npm install && npm run build"
echo "3. Run: cd /var/www/dros/crm-dashboard && npm install && npm run build"
echo "4. Run: cd /var/www/dros/agency-hub && npm install && npm run build"
echo "5. Configure .env file"
echo "6. Start with PM2"
