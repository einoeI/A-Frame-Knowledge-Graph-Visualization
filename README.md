# LOTR Knowledge Graph Visualization

A comparative visualization of the Lord of the Rings character interaction network in VR (A-Frame) and 2D (Vis.js).

## Live Demo (GitHub Pages)

| Visualization | URL |
|--------------|-----|
| **3D VR Main** | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/ |
| 3D Tutorial | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_3d.html |
| 2D Main | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/2d_visualization.html |
| 2D Tutorial | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_2d.html |

## Running Locally

### Prerequisites
- Node.js (any recent version)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open http://localhost:8080 in your browser.

### Build for Deployment

```bash
npm run build
```

This copies files to the `dist/` folder for deployment.

## Controls

### 3D VR (Desktop)
- **WASD** - Move around
- **Mouse** - Look around
- **Hover** - View character info + highlight connections
- **Click** - Highlight connections (persistent)
- **Click empty space** - Reset

### 3D VR (VR Headset)
- **Gaze** - Look at a node to view info
- **Trigger** - Select and highlight connections

### 2D
- **Scroll** - Zoom
- **Drag background** - Pan
- **Drag node** - Move node
- **Click node** - Highlight connections
