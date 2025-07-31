const fs = require('fs');
const path = require('path');

// Setup script to create necessary directories and files
function setup() {
    console.log('🚀 Setting up Thunderbolt⚡...\n');
    
    // Create necessary directories
    const directories = [
        'uploads',
        'assets',
        'utils',
        'ui',
        'scripts'
    ];
    
    directories.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}/`);
        } else {
            console.log(`📁 Directory exists: ${dir}/`);
        }
    });
    
    // Create uploads/.gitkeep to ensure uploads folder is tracked
    const gitkeepPath = path.join(process.cwd(), 'uploads', '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
        console.log('✅ Created uploads/.gitkeep');
    }
    
    // Create a simple icon if it doesn't exist
    const iconPath = path.join(process.cwd(), 'assets', 'icon.png');
    if (!fs.existsSync(iconPath)) {
        // Create a placeholder text file with instructions
        const iconInstructions = `
# Icon Files Needed

Please add the following icon files to the assets/ directory:

1. icon.png (512x512 PNG) - for Linux AppImage
2. icon.ico (Windows ICO format) - for Windows executable  
3. icon.icns (macOS ICNS format) - for macOS app bundle

You can create these from a single 512x512 PNG image using:
- Online converters (convertio.co, cloudconvert.com)
- ImageMagick: convert icon.png -resize 256x256 icon.ico
- png2icns tool: png2icns icon.icns icon.png

The icon should represent a lightning bolt (⚡) to match the Thunderbolt branding.
        `.trim();
        
        fs.writeFileSync(path.join(process.cwd(), 'assets', 'ICON_INSTRUCTIONS.txt'), iconInstructions);
        console.log('📝 Created assets/ICON_INSTRUCTIONS.txt');
    }
    
    console.log('\n🎉 Setup complete! Run "npm install" to install dependencies.');
    console.log('📖 Check README.md for usage instructions.');
}

// Run setup if called directly
if (require.main === module) {
    setup();
}

module.exports = { setup };