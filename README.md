# LOTR Knowledge Graph Visualization

A comparative visualization of the Lord of the Rings character interaction network in VR (A-Frame) and 2D (Vis.js) for the bachelor's thesis **"Enhancing Data Exploration: A Comparative Study of VR and 2D Data Visualizations based on Public Knowledge Graphs"** conducted at the Vienna University of Economics and Business (WU Wien).

## Thesis Objective

The aim of this work is to gain deeper insights into VR knowledge graph visualizations and evaluate their usefulness in comparison with traditional 2D equivalents through a comprehensive user study (N=10).

## Dataset

The project uses character interaction networks from the Lord of the Rings trilogy:
- **43 nodes**: Characters (persons-only subset used in visualization)
- **450 edges**: Co-occurrence relationships across all three books
- **Attributes**: Race, gender, and importance metrics

Full dataset contains 76 entities and 1,444 edges (including places and groups).

Source: ["morethanbooks" project's Lord of the Rings network dataset](https://github.com/morethanbooks/projects/tree/master)

## Technology Stack

**VR Implementation:**
- A-Frame 1.5.0 (WebXR framework)
- Three.js (underlying 3D engine)
- JavaScript ES6

**2D Implementation:**
- Vis.js Network v9.1.2
- JavaScript ES6

**Development Tools:**
- Python (data processing, statistical analysis)
- Claude Code (AI-assisted development) - see [CLAUDE_CODE_USAGE.md](CLAUDE_CODE_USAGE.md)

## Live Demo (GitHub Pages)

| Visualization | URL |
|--------------|-----|
| **3D VR Main** | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/ |
| 3D Tutorial | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_3d.html |
| **2D Main** | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/2d_visualization.html |
| 2D Tutorial | https://einoei.github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_2d.html |

## VR Compatibility

- **Desktop**: Chrome, Firefox, Edge (mouse + keyboard)
- **VR Headsets**: Meta Quest 2/3/Pro, HTC Vive, Valve Index (via WebXR)
- **Mobile**: No support

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

### 3D (Desktop)
- **WASD** - Move around
- **Mouse** - Look around
- **Hover** - View character info
- **Click** - Highlight connections
- **Click highlighted node again** - Reset highlight

*Tip: Align cursor with the center circle - it shows where you're hovering.*

### 3D (VR Headset)
- **Left thumbstick** - Move around
- **Right thumbstick** - Turn
- **Laser pointer** - Aim at characters
- **Trigger** - Select character

### 2D
- **Hover** - View character info
- **Click node** - Highlight connections
- **Click background** - Reset
- **Scroll** - Zoom in/out
- **Drag** - Pan the view

## References and Acknowledgments

This project was inspired by and utilizes resources from the following works:

### Primary Dataset Source
- **"Lord of the Rings Network"** by morethanbooks project
  Provided the character interaction dataset used to build the knowledge graph
  [GitHub Repository](https://github.com/morethanbooks/projects/tree/master/LotR)

### Inspiration and Related Work
- **"Lord of the Rings Analysis"** by Alon Cohen
  Inspiration for 2D visualization approaches
  [GitHub Repository](https://github.com/aloncohen1/My-Projects)

- **"SNA_LOTR"** by Diana Fernández et al.
  Social network analysis reference
  [GitHub Repository](https://github.com/fonsofhervella/SNA_LOTR)


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Leonie Theresa Greber

## Academic Context

**Institution**: Vienna University of Economics and Business (WU Wien)
**Department**: Information Systems & Operations Management
**Degree Program**: Bachelor of Science in Information Business
**Supervisor**: ao.Univ.Prof. Dr. Johann Mitlöhner
**Student**: Leonie Theresa Greber

---

*This repository represents original academic research conducted as part of a bachelor's thesis. All code and documentation are provided for educational and research purposes.*
