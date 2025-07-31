const net = require('net');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const { BrowserWindow } = require('electron');
const mime = require('mime-types');

let server = null;
let wss = null; // WebSocket server for signalling
const peers = new Map(); // peerId => {socket, info}
let httpServer = null;
let serverStatus = {
  running: false,
  port: null,
  ip: null,
  connectedClients: 0,
  sharedFiles: new Map(),
  downloadStats: new Map()
};

function startServer(port = 3000, ip) {
  return new Promise((resolve, reject) => {
    if (server) {
      reject(new Error('Server is already running'));
      return;
    }

    // Create HTTP server for web interface
    httpServer = http.createServer((req, res) => {
      handleHttpRequest(req, res);
    });

    // Create TCP server for file transfers
    server = net.createServer((socket) => {
      handleTCPConnection(socket);
    });

    httpServer.listen(port, () => {
      server.listen(port + 1, () => {
        // Start WebSocket signalling server on port+2
        wss = new WebSocket.Server({ port: port + 2 }, () => {
          console.log(`⚡ Thunderbolt WS Signalling Server running on ${ip}:${port + 2}`);
        });

        wss.on('connection', (ws) => {
          ws.on('message', (msg) => {
            try {
              const data = JSON.parse(msg.toString());
              if (data.type === 'register') {
                // {type:'register', id, name, files}
                peers.set(data.id, { socket: ws, info: data });
                broadcastPeerList();
              } else if (data.type === 'signal') {
                // {type:'signal', targetId, payload}
                const target = peers.get(data.targetId);
                if (target) {
                  target.socket.send(JSON.stringify({ type: 'signal', fromId: data.fromId, payload: data.payload }));
                }
              }
            } catch (e) {
              console.error('WS message error', e);
            }
          });

          ws.on('close', () => {
            // Remove peer that owns this socket
            for (const [id, peer] of peers.entries()) {
              if (peer.socket === ws) {
                peers.delete(id);
                break;
              }
            }
            broadcastPeerList();
          });
        });

        function broadcastPeerList() {
          const list = Array.from(peers.values()).map(p => ({ id: p.info.id, name: p.info.name }));
          const payload = JSON.stringify({ type: 'peerList', peers: list });
          peers.forEach(p => p.socket.send(payload));
        }

        serverStatus.running = true;
        serverStatus.port = port;
        serverStatus.ip = ip;
        
        console.log(`⚡ Thunderbolt HTTP Server running on ${ip}:${port}`);
        console.log(`⚡ Thunderbolt TCP Server running on ${ip}:${port + 1}`);
        
        resolve({
          httpPort: port,
          tcpPort: port + 1,
          ip: ip
        });
      });
    });

    httpServer.on('error', (err) => {
      server = null;
      httpServer = null;
      reject(err);
    });

    server.on('error', (err) => {
      server = null;
      httpServer = null;
      reject(err);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        if (httpServer) {
          httpServer.close(() => {
            httpServer = null;
            serverStatus.running = false;
            serverStatus.connectedClients = 0;
            console.log('⚡ Thunderbolt servers stopped');
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

function handleHttpRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    serveWebInterface(res);
  } else if (url.pathname === '/api/files') {
    if (req.method === 'GET') {
      getSharedFiles(res);
    } else if (req.method === 'POST') {
      uploadFile(req, res);
    }
  } else if (url.pathname.startsWith('/api/download/')) {
    const fileId = url.pathname.split('/')[3];
    downloadFile(fileId, res);
  } else if (url.pathname === '/api/status') {
    getServerInfo(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}

function serveWebInterface(res) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ Thunderbolt File Share</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .file-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="gradient-bg text-white py-8">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-4xl font-bold mb-2">⚡ Thunderbolt</h1>
            <p class="text-xl opacity-90">Lightning-fast file sharing</p>
        </div>
    </div>

    <div class="container mx-auto px-4 py-8">
        <!-- Upload Section -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">📤 Upload Files</h2>
            <div id="dropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <p class="text-gray-500 mb-4">Drag & drop files here or click to select</p>
                <input type="file" id="fileInput" multiple class="hidden">
                <button onclick="document.getElementById('fileInput').click()" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Select Files
                </button>
            </div>
            <div id="uploadProgress" class="hidden mt-4">
                <div class="bg-gray-200 rounded-full h-2">
                    <div id="progressBar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                <p id="progressText" class="text-sm text-gray-600 mt-2">Uploading...</p>
            </div>
        </div>

        <!-- Files Section -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">📁 Available Files</h2>
            <div id="filesList" class="space-y-3">
                <p class="text-gray-500 text-center py-8">No files shared yet</p>
            </div>
        </div>
        <!-- Peers Section -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">👥 Connected Peers</h2>
            <ul id="peersList" class="space-y-3"></ul>
        </div>
    </div>

    <script>
        let serverInfo = null;
        
        // ---------- Mesh nickname & signalling ----------
        const peerId = 'peer-' + Math.random().toString(36).substring(2,9);
        let nickname = localStorage.getItem('tbNickname');
        if(!nickname){
          nickname = prompt('Enter your display name:','') || peerId;
          localStorage.setItem('tbNickname', nickname);
        }
        let ws;
        function connectWS(){
          if(!serverInfo) return;
          const wsUrl = \`ws://\${serverInfo.ip}:\${serverInfo.port+2}\`;
          ws = new WebSocket(wsUrl);
          ws.onopen = ()=>{
            ws.send(JSON.stringify({type:'register', id: peerId, name: nickname}));
          };
          ws.onmessage = evt=>{
            try{
              const data = JSON.parse(evt.data);
              if(data.type==='peerList') updatePeers(data.peers);
            }catch(e){}
          };
        }
        function updatePeers(list){
          const ul=document.getElementById('peersList');
          if(!ul) return;
          ul.innerHTML='';
          if(list.length===0){ul.innerHTML='<li class="text-gray-400">No peers yet</li>';return;}
          list.forEach(p=>{const li=document.createElement('li');li.textContent=p.name+(p.id===peerId?' (you)':'');ul.appendChild(li);});
        }

        // Load files on page load
        loadFiles();
        loadServerInfo();
        
        // Auto-refresh every 5 seconds
        setInterval(() => {
            loadFiles();
            loadServerInfo();
        }, 5000);

        // File input handling
        document.getElementById('fileInput').addEventListener('change', handleFileSelect);
        
        // Drag and drop handling
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-500');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500');
            const files = Array.from(e.dataTransfer.files);
            uploadFiles(files);
        });

        function handleFileSelect(e) {
            const files = Array.from(e.target.files);
            uploadFiles(files);
        }

        async function uploadFiles(files) {
            if (files.length === 0) return;

            const progressDiv = document.getElementById('uploadProgress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            progressDiv.classList.remove('hidden');
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                progressText.textContent = \`Uploading \${file.name} (\${i + 1}/\${files.length})\`;
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const response = await fetch('/api/files', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const progress = ((i + 1) / files.length) * 100;
                        progressBar.style.width = progress + '%';
                    } else {
                        throw new Error('Upload failed');
                    }
                } catch (error) {
                    alert('Error uploading ' + file.name + ': ' + error.message);
                }
            }
            
            progressText.textContent = 'Upload complete!';
            setTimeout(() => {
                progressDiv.classList.add('hidden');
                progressBar.style.width = '0%';
                loadFiles();
            }, 2000);
        }

        async function loadFiles() {
            try {
                const response = await fetch('/api/files');
                const files = await response.json();
                
                const filesList = document.getElementById('filesList');
                
                if (files.length === 0) {
                    filesList.innerHTML = '<p class="text-gray-500 text-center py-8">No files shared yet</p>';
                } else {
                    filesList.innerHTML = files.map(file => \`
                        <div class="flex items-center justify-between p-4 border rounded-lg file-hover transition-all duration-200">
                            <div class="flex items-center space-x-3">
                                <div class="text-2xl">\${getFileIcon(file.name)}</div>
                                <div>
                                    <h3 class="font-semibold text-gray-800">\${file.name}</h3>
                                    <p class="text-sm text-gray-500">\${formatFileSize(file.size)} • Added \${new Date(file.dateAdded).toLocaleString()}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-500">\${file.downloads || 0} downloads</span>
                                <a href="/api/download/\${file.id}" download="\${file.name}" 
                                   class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                    ⬇️ Download
                                </a>
                            </div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                console.error('Error loading files:', error);
            }
        }

        async function loadServerInfo() {
            try {
                const response = await fetch('/api/status');
                serverInfo = await response.json();
                
                // Update any UI elements that show server info
                document.title = \`⚡ Thunderbolt - \${serverInfo.connectedClients} clients\`;
                connectWS();
            } catch (error) {
                console.error('Error loading server info:', error);
            }
        }

        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const iconMap = {
                'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄',
                'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
                'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬',
                'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
                'zip': '📦', 'rar': '📦', '7z': '📦',
                'exe': '⚙️', 'msi': '⚙️',
                'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻'
            };
            return iconMap[ext] || '📄';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

function getSharedFiles(res) {
  const files = Array.from(serverStatus.sharedFiles.values());
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(files));
}

function uploadFile(req, res) {
  // Handle multipart file upload
  let body = Buffer.alloc(0);
  let boundary = req.headers['content-type'].split('boundary=')[1];
  
  req.on('data', chunk => {
    body = Buffer.concat([body, chunk]);
  });
  
  req.on('end', () => {
    try {
      const parsed = parseMultipartData(body, boundary);
      if (parsed.file) {
        const fileId = Date.now().toString();
        const filePath = path.join(__dirname, 'uploads', parsed.file.filename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, parsed.file.data);
        
        const fileInfo = {
          id: fileId,
          name: parsed.file.filename,
          size: parsed.file.data.length,
          path: filePath,
          dateAdded: new Date().toISOString(),
          downloads: 0
        };
        
        serverStatus.sharedFiles.set(fileId, fileInfo);
        
        // Notify main window
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('server-event', {
            type: 'file-uploaded',
            file: fileInfo
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, fileId }));
      } else {
        throw new Error('No file found in upload');
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

function downloadFile(fileId, res) {
  const fileInfo = serverStatus.sharedFiles.get(fileId);
  if (!fileInfo || !fs.existsSync(fileInfo.path)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }
  
  // Update download count
  fileInfo.downloads = (fileInfo.downloads || 0) + 1;
  
  const mimeType = mime.lookup(fileInfo.path) || 'application/octet-stream';
  
  res.writeHead(200, {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename="${fileInfo.name}"`,
    'Content-Length': fileInfo.size
  });
  
  const fileStream = fs.createReadStream(fileInfo.path);
  fileStream.pipe(res);
  
  // Notify main window
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('server-event', {
      type: 'file-downloaded',
      file: fileInfo
    });
  }
}

function getServerInfo(res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    running: serverStatus.running,
    port: serverStatus.port,
    ip: serverStatus.ip,
    connectedClients: serverStatus.connectedClients,
    totalFiles: serverStatus.sharedFiles.size,
    totalDownloads: Array.from(serverStatus.sharedFiles.values()).reduce((sum, file) => sum + (file.downloads || 0), 0)
  }));
}

function handleTCPConnection(socket) {
  serverStatus.connectedClients++;
  
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('client-connected', {
      address: socket.remoteAddress,
      port: socket.remotePort
    });
  }
  
  socket.on('close', () => {
    serverStatus.connectedClients--;
    if (mainWindow) {
      mainWindow.webContents.send('client-disconnected', {
        address: socket.remoteAddress,
        port: socket.remotePort
      });
    }
  });
  
  socket.on('error', (err) => {
    console.error('TCP Socket error:', err);
  });
}

function parseMultipartData(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;
  
  while (true) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;
    
    if (start !== 0) {
      parts.push(buffer.slice(start, boundaryIndex));
    }
    
    start = boundaryIndex + boundaryBuffer.length + 2; // +2 for \r\n
  }
  
  const result = {};
  
  for (const part of parts) {
    if (part.length === 0) continue;
    
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;
    
    const headers = part.slice(0, headerEndIndex).toString();
    const data = part.slice(headerEndIndex + 4, part.length - 2); // -2 for trailing \r\n
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        result[name] = {
          filename: filenameMatch[1],
          data: data
        };
      } else {
        result[name] = data.toString();
      }
    }
  }
  
  return result;
}

function getServerStatus() {
  return { ...serverStatus };
}

function addSharedFile(filePath) {
  const fileId = Date.now().toString();
  const stats = fs.statSync(filePath);
  const fileInfo = {
    id: fileId,
    name: path.basename(filePath),
    size: stats.size,
    path: filePath,
    dateAdded: new Date().toISOString(),
    downloads: 0
  };
  
  serverStatus.sharedFiles.set(fileId, fileInfo);
  return fileInfo;
}

module.exports = {
  startServer,
  stopServer,
  getServerStatus,
  addSharedFile
};