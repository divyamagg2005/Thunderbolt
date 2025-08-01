class ThunderboltUI {
    constructor() {
        this.serverRunning = false;
        this.currentServerInfo = null;
        this.activityLog = [];
        this.sharedFiles = new Map();
        // Mesh identifiers
        this.peerId = this.generatePeerId();
        this.nickname = this.getOrPromptNickname();
        this.peers = [];
        this.peerConnections = {};
        this.ws = null;
        
        this.initializeEventListeners();
        this.initializeDragAndDrop();
        this.setupElectronEventListeners();
        this.updateUI();
    }

    initializeEventListeners() {
        // Server control buttons
        document.getElementById('startServerBtn').addEventListener('click', () => this.startServer());
        document.getElementById('stopServerBtn').addEventListener('click', () => this.stopServer());
        
        // File selection buttons
        document.getElementById('selectFilesBtn').addEventListener('click', () => this.selectFiles());
        document.getElementById('selectFolderBtn').addEventListener('click', () => this.selectFolder());
        
        // Copy URL button
        document.getElementById('copyURLBtn').addEventListener('click', () => this.copyServerURL());
        
        // Auto-refresh server status
        setInterval(() => this.updateServerStatus(), 2000);
    }

    initializeDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(files);
        });
    }

    setupElectronEventListeners() {
        // Server events
        window.electronAPI.onServerEvent((data) => {
            this.handleServerEvent(data);
        });
        
        // Client connection events
        window.electronAPI.onClientConnected((data) => {
            this.addActivity(`📱 Client connected from ${data.address}`, 'info');
            this.updateUI();
        });
        
        window.electronAPI.onClientDisconnected((data) => {
            this.addActivity(`📱 Client disconnected from ${data.address}`, 'info');
            this.updateUI();
        });
        
        // File progress events
        window.electronAPI.onFileProgress((data) => {
            this.updateFileProgress(data);
        });
    }

    async startServer() {
        try {
            this.setButtonLoading('startServerBtn', true);
            
            const result = await window.electronAPI.startServer(3000);
            
            if (result.success) {
                this.serverRunning = true;
                this.currentServerInfo = result;
                this.addActivity('⚡ Server started successfully', 'success');
                this.connectSignalling();
                this.updateUI();
            } else {
                this.showToast('Failed to start server: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error starting server: ' + error.message, 'error');
        } finally {
            this.setButtonLoading('startServerBtn', false);
        }
    }

    async stopServer() {
        try {
            this.setButtonLoading('stopServerBtn', true);
            
            const result = await window.electronAPI.stopServer();
            
            if (result.success) {
                this.serverRunning = false;
                this.currentServerInfo = null;
                this.addActivity('⏹️ Server stopped', 'info');
                this.updateUI();
            } else {
                this.showToast('Failed to stop server: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error stopping server: ' + error.message, 'error');
        } finally {
            this.setButtonLoading('stopServerBtn', false);
        }
    }

    async selectFiles() {
        try {
            const result = await window.electronAPI.selectFiles();
            
            if (!result.canceled && result.filePaths.length > 0) {
                this.addActivity(`📁 Selected ${result.filePaths.length} file(s)`, 'info');
                // In a real implementation, you'd add these files to the server
                this.showToast(`Selected ${result.filePaths.length} file(s) for sharing`, 'success');
            }
        } catch (error) {
            this.showToast('Error selecting files: ' + error.message, 'error');
        }
    }

    async selectFolder() {
        try {
            const result = await window.electronAPI.selectFolder();
            
            if (!result.canceled && result.filePaths.length > 0) {
                this.addActivity(`📂 Selected folder: ${result.filePaths[0]}`, 'info');
                this.showToast('Folder selected for sharing', 'success');
            }
        } catch (error) {
            this.showToast('Error selecting folder: ' + error.message, 'error');
        }
    }

    handleFileSelection(files) {
        if (!this.serverRunning) {
            this.showToast('Please start the server first', 'warning');
            return;
        }
        
        this.addActivity(`📤 Added ${files.length} file(s) to share`, 'success');
        
        files.forEach(file => {
            const fileInfo = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                dateAdded: new Date().toISOString(),
                downloads: 0
            };
            
            this.sharedFiles.set(fileInfo.id, fileInfo);
        });
        
        this.updateSharedFilesList();
        this.showToast(`Added ${files.length} file(s) for sharing`, 'success');
    }

    /* QR code section removed

    async updateServerStatus() {





            document.getElementById('qrCode').innerHTML = `
                <div class="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">


            return;
        }
        
        try {









            
            document.getElementById('qrCode').innerHTML = `

            `;
        } catch (error) {

            document.getElementById('qrCode').innerHTML = `
                <div class="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">

                </div>
            `;
        }
    */

    async updateServerStatus() {
        try {
            const status = await window.electronAPI.getServerStatus();
            
            if (status.running !== this.serverRunning) {
                this.serverRunning = status.running;
                this.updateUI();
            }
            
            // Update statistics
            if (status.running) {
                document.getElementById('totalFiles').textContent = status.sharedFiles?.size || 0;
                document.getElementById('totalDownloads').textContent = status.totalDownloads || 0;
                document.getElementById('connectedClients').textContent = status.connectedClients || 0;
                document.getElementById('clientCount').textContent = `${status.connectedClients || 0} clients`;
            }
        } catch (error) {
            console.error('Error updating server status:', error);
        }
    }

    handleServerEvent(data) {
        switch (data.type) {
            case 'file-uploaded':
                this.addActivity(`📤 File uploaded: ${data.file.name}`, 'success');
                this.sharedFiles.set(data.file.id, data.file);
                this.updateSharedFilesList();
                break;
                
            case 'file-downloaded':
                this.addActivity(`📥 File downloaded: ${data.file.name}`, 'info');
                if (this.sharedFiles.has(data.file.id)) {
                    this.sharedFiles.get(data.file.id).downloads = data.file.downloads;
                    this.updateSharedFilesList();
                }
                break;
                
            default:
                console.log('Unknown server event:', data);
        }
    }

    updateUI() {
        const startBtn = document.getElementById('startServerBtn');
        const stopBtn = document.getElementById('stopServerBtn');
        const serverInfo = document.getElementById('serverInfo');
        const serverStatus = document.getElementById('serverStatus');
        
        if (this.serverRunning) {
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            serverInfo.classList.remove('hidden');
            
            serverStatus.innerHTML = `
                <span class="status-indicator status-online"></span>
                <span class="text-sm">Server Online</span>
            `;
            
            if (this.currentServerInfo) {
                document.getElementById('serverIP').textContent = this.currentServerInfo.ip;
                document.getElementById('serverURL').textContent = this.currentServerInfo.url;
            }
        } else {
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            serverInfo.classList.add('hidden');
            
            serverStatus.innerHTML = `
                <span class="status-indicator status-offline"></span>
                <span class="text-sm">Server Offline</span>
            `;
            
            document.getElementById('clientCount').textContent = '0 clients';
        }
    }

    updateSharedFilesList() {
        const container = document.getElementById('sharedFilesList');
        
        if (this.sharedFiles.size === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📄</div>
                    <p>No files shared yet</p>
                    <p class="text-sm">Add files above to start sharing</p>
                </div>
            `;
            return;
        }
        
        const filesArray = Array.from(this.sharedFiles.values());
        container.innerHTML = filesArray.map(file => `
            <div class="file-item p-4 border rounded-lg hover:shadow-md">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">${this.getFileIcon(file.name)}</div>
                        <div>
                            <h3 class="font-semibold text-gray-800">${file.name}</h3>
                            <p class="text-sm text-gray-500">${this.formatFileSize(file.size)} • ${file.downloads} downloads</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs text-gray-400">${new Date(file.dateAdded).toLocaleTimeString()}</span>
                        <button onclick="thunderboltUI.removeFile('${file.id}')" class="text-red-500 hover:text-red-700 p-1">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    removeFile(fileId) {
        if (this.sharedFiles.has(fileId)) {
            const file = this.sharedFiles.get(fileId);
            this.sharedFiles.delete(fileId);
            this.addActivity(`🗑️ Removed file: ${file.name}`, 'info');
            this.updateSharedFilesList();
        }
    }

    addActivity(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const activity = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp
        };
        
        this.activityLog.unshift(activity);
        
        // Keep only last 50 activities
        if (this.activityLog.length > 50) {
            this.activityLog = this.activityLog.slice(0, 50);
        }
        
        this.updateActivityLog();
    }

    updateActivityLog() {
        const container = document.getElementById('activityLog');
        
        if (this.activityLog.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>Activity will appear here</p>
                </div>
            `;
            return;
        }
        
        const typeColors = {
            success: 'text-green-600',
            error: 'text-red-600',
            warning: 'text-yellow-600',
            info: 'text-blue-600'
        };
        
        container.innerHTML = this.activityLog.map(activity => `
            <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50">
                <span class="${typeColors[activity.type] || 'text-gray-600'}">${activity.message}</span>
                <span class="text-xs text-gray-400">${activity.timestamp}</span>
            </div>
        `).join('');
    }

    async copyServerURL() {
        if (!this.currentServerInfo) return;
        
        try {
            await navigator.clipboard.writeText(this.currentServerInfo.url);
            this.showToast('URL copied to clipboard!', 'success');
        } catch (error) {
            this.showToast('Failed to copy URL', 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const typeStyles = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `${typeStyles[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.getElementById(toastId)) {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
            const originalText = button.innerHTML;
            button.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
            `;
            button.dataset.originalText = originalText;
        } else {
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const iconMap = {
            // Documents
            'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄', 'rtf': '📄',
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            'ppt': '📊', 'pptx': '📊',
            
            // Images
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 
            'bmp': '🖼️', 'tiff': '🖼️', 'webp': '🖼️',
            
            // Videos
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'flv': '🎬',
            'wmv': '🎬', 'webm': '🎬', 'm4v': '🎬',
            
            // Audio
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵', 'm4a': '🎵',
            'ogg': '🎵', 'wma': '🎵',
            
            // Archives
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
            
            // Applications
            'exe': '⚙️', 'msi': '⚙️', 'dmg': '⚙️', 'pkg': '⚙️', 'deb': '⚙️',
            'rpm': '⚙️', 'app': '⚙️',
            
            // Code
            'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻',
            'cpp': '💻', 'c': '💻', 'php': '💻', 'rb': '💻', 'go': '💻',
            'rs': '💻', 'swift': '💻', 'kt': '💻'
        };
        
        return iconMap[ext] || '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFileProgress(data) {
        // Handle file transfer progress updates
        console.log('File progress:', data);
    }

    /* ---------- Mesh Signalling ---------- */
    getOrPromptNickname() {
        let name = localStorage.getItem('tbNickname');
        if (!name) {
            try {
            name = prompt('Enter your display name:', '')?.trim();
        } catch (e) {
            // prompt unsupported: fallback to hostname
            name = window.system?.hostname || this.peerId;
        }
            if (!name) name = this.peerId;
            localStorage.setItem('tbNickname', name);
        }
        return name;
    }

    generatePeerId() {
        return 'peer-' + Math.random().toString(36).substring(2, 9);
    }

    connectSignalling() {
        if (!this.currentServerInfo) return;
        const wsUrl = `ws://${this.currentServerInfo.ip}:${this.currentServerInfo.port + 2}`;
        this.ws = new WebSocket(wsUrl);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ type: 'register', id: this.peerId, name: this.nickname }));
        };
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'peerList') {
                    this.peers = data.peers;
                    this.updatePeersList();
                } else if (data.type === 'signal') {
                    this.handleSignal(data.fromId, data.payload);
                }
            } catch (e) {
                console.error('WS message error', e);
            }
        };
        this.ws.onclose = () => {
            console.warn('Signalling connection closed');
        };
    }

    handleSignal(fromId, payload) {
        let pc = this.peerConnections[fromId];
        if (!pc) pc = this.createPeerConnection(fromId);
        if (payload.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(payload)).then(() => pc.createAnswer())
              .then(answer => pc.setLocalDescription(answer))
              .then(() => {
                  this.ws.send(JSON.stringify({ type: 'signal', targetId: fromId, fromId: this.peerId, payload: pc.localDescription }));
              });
        } else if (payload.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(payload));
        } else if (payload.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(payload));
        }
    }

    createPeerConnection(peerId) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
        this.peerConnections[peerId] = pc;

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                this.ws.send(JSON.stringify({ type: 'signal', targetId: peerId, fromId: this.peerId, payload: { candidate: e.candidate } }));
            }
        };

        pc.ondatachannel = (ev) => {
            this.setupDataChannel(ev.channel, peerId, false);
        };

        return pc;
    }

    setupDataChannel(dc, peerId, isInitiator) {
        this.peerConnections[peerId].dc = dc;
        dc.binaryType = 'arraybuffer';
        dc.onopen = () => {
            console.log('DataChannel open with', peerId);
        };
        dc.onmessage = (ev) => {
            console.log('Data from', peerId, ev.data);
            // TODO: handle incoming file chunks
        };
        if (isInitiator) {
            dc.onopen = () => {
                console.log('DataChannel open with', peerId);
            };
        }
    }

    initiateConnection(peerId) {
        const pc = this.createPeerConnection(peerId);
        const dc = pc.createDataChannel('file');
        this.setupDataChannel(dc, peerId, true);
        pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
            this.ws.send(JSON.stringify({ type: 'signal', targetId: peerId, fromId: this.peerId, payload: pc.localDescription }));
        });
    }

    selectAndSendFile(peerId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                this.sendFile(peerId, file);
            }
        };
        input.click();
    }

    sendFile(peerId, file) {
        const conn = this.peerConnections[peerId];
        if (!conn || !conn.dc || conn.dc.readyState !== 'open') {
            this.showToast('No data channel to peer', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            conn.dc.send(JSON.stringify({ meta: { name: file.name, size: file.size } }));
            conn.dc.send(reader.result);
            this.addActivity(`📤 Sent ${file.name} to ${peerId}`, 'success');
        };
        reader.readAsArrayBuffer(file);
    }

    updatePeersList() {
        const ul = document.getElementById('peersList');
        if (!ul) return;
        ul.innerHTML = '';
        if (this.peers.length === 0) {
            ul.innerHTML = '<li class="text-gray-400">No peers yet</li>';
            return;
        }
        this.peers.forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.name}${p.id === this.peerId ? ' (you)' : ''}`;
            if (p.id !== this.peerId) {
                const connectBtn = document.createElement('button');
                connectBtn.textContent = 'Connect';
                connectBtn.className = 'ml-2 bg-blue-500 text-white px-2 py-1 rounded';
                connectBtn.onclick = () => this.initiateConnection(p.id);
                li.appendChild(connectBtn);
                const sendBtn = document.createElement('button');
                sendBtn.textContent = 'Send File';
                sendBtn.className = 'ml-2 bg-green-500 text-white px-2 py-1 rounded';
                sendBtn.onclick = () => this.selectAndSendFile(p.id);
                li.appendChild(sendBtn);
            }
            ul.appendChild(li);
        });
    }

    updateFileProgress(data) {
        // Handle file transfer progress updates
        console.log('File progress:', data);
    }
}

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.thunderboltUI = new ThunderboltUI();
});

// Expose globally for HTML onclick handlers
window.thunderboltUI = null;