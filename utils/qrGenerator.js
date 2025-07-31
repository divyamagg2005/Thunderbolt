const QRCode = require('qrcode');

async function generateQR(url, options = {}) {
  const defaultOptions = {
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'M'
  };
  
  const qrOptions = { ...defaultOptions, ...options };
  
  try {
    const qrDataUrl = await QRCode.toDataURL(url, qrOptions);
    return {
      success: true,
      dataUrl: qrDataUrl,
      url: url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateQRBuffer(url, options = {}) {
  const defaultOptions = {
    type: 'png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'M'
  };
  
  const qrOptions = { ...defaultOptions, ...options };
  
  try {
    const buffer = await QRCode.toBuffer(url, qrOptions);
    return {
      success: true,
      buffer: buffer,
      url: url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateQRSVG(url, options = {}) {
  const defaultOptions = {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    errorCorrectionLevel: 'M'
  };
  
  const qrOptions = { ...defaultOptions, ...options };
  
  try {
    const svg = await QRCode.toString(url, qrOptions);
    return {
      success: true,
      svg: svg,
      url: url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function createThunderboltQR(url) {
  // Create a custom QR with Thunderbolt branding
  return generateQR(url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#4F46E5', // Indigo color for branding
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H' // High error correction for better reliability
  });
}

module.exports = {
  generateQR,
  generateQRBuffer,
  generateQRSVG,
  createThunderboltQR
};