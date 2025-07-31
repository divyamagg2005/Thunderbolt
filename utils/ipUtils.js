const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // Priority order: WiFi, Ethernet, then any other
  const priorityOrder = ['Wi-Fi', 'WiFi', 'wlan0', 'eth0', 'Ethernet'];
  
  // First, try to find interfaces in priority order
  for (const priority of priorityOrder) {
    const iface = interfaces[priority];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  
  // If no priority interface found, search all interfaces
  for (const name in interfaces) {
    const iface = interfaces[name];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        // Skip Docker and VirtualBox interfaces
        if (!alias.address.startsWith('172.') && 
            !alias.address.startsWith('10.0.2.') &&
            !name.toLowerCase().includes('docker') &&
            !name.toLowerCase().includes('vbox')) {
          return alias.address;
        }
      }
    }
  }
  
  return null;
}

function getAllNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const result = [];
  
  for (const name in interfaces) {
    const iface = interfaces[name];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        result.push({
          name,
          address: alias.address,
          netmask: alias.netmask,
          mac: alias.mac
        });
      }
    }
  }
  
  return result;
}

function isValidIP(ip) {
  const parts = ip.split('.');
  return parts.length === 4 && parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

function isPrivateIP(ip) {
  const parts = ip.split('.').map(part => parseInt(part, 10));
  
  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true;
  
  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
}

module.exports = {
  getLocalIP,
  getAllNetworkInterfaces,
  isValidIP,
  isPrivateIP
};