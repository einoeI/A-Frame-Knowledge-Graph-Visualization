/**
 * Simple build script - copies src files to dist for deployment
 * No bundling needed since we use vanilla JS and CDN libraries
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Files and folders to copy
const filesToCopy = [
    'index.html',
    '2d_visualization.html',
    'tutorial_3d.html',
    'tutorial_2d.html',
    'lotr_graph.json',       // for 2D visualization
    'lotr_positioned.json',  // for 3D visualization
    'tutorial_graph.json',
    'components'  // folder
];

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy function for files and directories
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('Building to dist/...');

filesToCopy.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);

    if (fs.existsSync(srcPath)) {
        copyRecursive(srcPath, destPath);
        console.log(`  Copied: ${file}`);
    } else {
        console.warn(`  Warning: ${file} not found`);
    }
});

console.log('Build complete!');
