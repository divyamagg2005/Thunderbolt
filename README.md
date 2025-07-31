# ⚡ Thunderbolt - Lightning-Fast File Sharing

A cross-platform desktop application for offline file sharing over local networks using hotspot technology.

## 🚀 Features

- **🌐 Cross-Platform**: Works on Windows, macOS, and Linux
- **⚡ Lightning Fast**: Uses raw TCP sockets for optimal transfer speeds
- **📱 Mobile Friendly**: QR code access for easy mobile device connection
- **🔒 Secure & Private**: All transfers happen locally - no internet required
- **📂 Drag & Drop**: Intuitive file sharing interface
- **📊 Real-time Monitoring**: Live statistics and activity logging
- **🎯 Zero Configuration**: Just start and share!

## 🏗️ Technology Stack

- **Frontend**: Electron.js + HTML + Tailwind CSS
- **Backend**: Node.js with raw TCP sockets
- **QR Generation**: qrcode library
- **File Handling**: Native Node.js file system APIs
- **Compression**: archiver for folder handling

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## ⚡ Quick Start

### 1. Clone or Download

```bash
git clone <repository-url>
cd thunderbolt
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Mode

```bash
npm run dev
```

### 4. Build for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 📁 Project Structure

```
thunderbolt/
├── main.js                 # Electron main process
├── preload.js              # IPC bridge
├── tcp_server.js           # File transfer server
├── ui/
│   ├── index.html          # Main UI
│   └── renderer.js         # Frontend logic
├── utils/
│   ├── ipUtils.js          # Network utilities
│   └── qrGenerator.js      # QR code generation
├── assets/
│   └── icon.png            # App icon
├── uploads/                # Temporary file storage
└── package.json
```

## 🎯 How to Use

1. **Start the Application**: Launch Thunderbolt on your laptop/desktop
2. **Start Server**: Click "Start Server" button
3. **Share Files**: 
   - Drag & drop files into the app
   - Or use "Select Files" button
4. **Connect Devices**: 
   - Scan QR code with mobile devices
   - Or manually enter the displayed URL
5. **Transfer Files**: Download/upload files through the web interface

## 🌐 Network Setup

### Creating a Hotspot

**Windows:**
```bash
netsh wlan set hostednetwork mode=allow ssid=Thunderbolt key=password123
netsh wlan start hostednetwork
```

**macOS:**
- System Preferences → Sharing → Internet Sharing
- Share from: Ethernet, To: Wi-Fi

**Linux (Ubuntu):**
```bash
sudo apt install hostapd
# Configure hotspot through Network Manager
```

## 🔧 Configuration

### Default Settings
- **HTTP Port**: 3000
- **TCP Port**: 3001
- **Upload Directory**: `./uploads/`
- **Max File Size**: No limit (system dependent)

### Custom Configuration
You can modify settings in `main.js`:

```javascript
const SERVER_CONFIG = {
  httpPort: 3000,
  tcpPort: 3001,
  uploadDir: './uploads/',
  maxFileSize: '10GB'
};
```

## 🚀 Building Executables

The app uses `electron-builder` for packaging:

```bash
# Install electron-builder globally (optional)
npm install -g electron-builder

# Build for all platforms
npm run dist

# Output files will be in dist/ folder:
# - Thunderbolt⚡ Setup.exe (Windows)
# - Thunderbolt⚡.dmg (macOS)  
# - Thunderbolt⚡.AppImage (Linux)
```

## 🔒 Security Features

- **Local Network Only**: No internet connection required
- **Private IP Range**: Only works within local network
- **No Data Storage**: Files are temporarily stored during transfer
- **Optional PIN Protection**: Can be enabled for additional security

## 🎨 Customization

### Changing Theme Colors
Edit the CSS variables in `ui/index.html`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #FFD700;
}
```

### Custom Branding
- Replace `assets/icon.png` with your logo
- Update app name in `package.json`
- Modify title and branding in HTML files

## 🐛 Troubleshooting

### Common Issues

**Server Won't Start**
- Check if ports 3000/3001 are available
- Run as administrator/sudo if needed
- Verify firewall settings

**Can't Connect from Mobile**
- Ensure devices are on same network
- Check IP address is correct
- Disable VPN if active

**File Transfer Fails**
- Check available disk space
- Verify file permissions
- Try smaller files first

### Debug Mode
```bash
npm run dev -- --debug
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Electron.js team for the excellent framework
- QRCode.js for QR generation
- Tailwind CSS for beautiful styling
- Node.js community for excellent libraries

## 🔮 Future Roadmap

- [ ] Mobile apps (iOS/Android)
- [ ] File encryption
- [ ] Multi-language support
- [ ] Cloud backup integration
- [ ] Advanced file management
- [ ] Speed optimization
- [ ] Progress indicators for large files

---

**⚡ Thunderbolt** - Making file sharing lightning fast and effortless!

For support or questions, please open an issue on GitHub.