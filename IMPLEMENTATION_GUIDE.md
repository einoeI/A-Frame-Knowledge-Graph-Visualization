# Implementation Guide: VR Knowledge Graph Visualization

This document provides a detailed technical description of the A-Frame VR Knowledge Graph Visualization implementation for use in a bachelor thesis.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Data Processing Pipeline](#data-processing-pipeline)
5. [3D VR Visualization (A-Frame)](#3d-vr-visualization-a-frame)
6. [2D Visualization (Vis.js)](#2d-visualization-visjs)
7. [Interaction Design](#interaction-design)
8. [Visual Design Decisions](#visual-design-decisions)
9. [Deployment](#deployment)

---

## 1. Project Overview

This project implements a comparative visualization system for the Lord of the Rings character interaction network. The system provides two visualization modes:

- **3D VR Visualization**: An immersive WebVR experience using A-Frame
- **2D Traditional Visualization**: A web-based network graph using Vis.js

The goal is to evaluate whether VR provides advantages over traditional 2D visualizations for exploring knowledge graphs, following the methodology from the reference paper "Exploring Data in Virtual Reality: Comparisons with 2D Data Visualizations" (CHI 2018).

### Dataset

The dataset consists of:
- **43 character nodes** (persons only)
- **450 edges** representing co-occurrence relationships across the three LOTR books
- Node attributes: id, label, race, gender, weight (total interactions)
- Edge attributes: source, target, weight (co-occurrence count)

---

## 2. Technology Stack

### 3D VR Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| A-Frame | 1.5.0 | WebVR/WebXR framework |
| Three.js | (bundled) | 3D rendering engine (underlying A-Frame) |
| aframe-look-at-component | 0.8.0 | Billboard effect for labels |

### 2D Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| Vis.js Network | 9.1.2 | Force-directed graph rendering |

### Development Tools
| Tool | Purpose |
|------|---------|
| Python 3.x | Data preprocessing and position calculation |
| NetworkX | Graph algorithms and Fruchterman-Reingold layout |
| http-server | Local development server |
| Node.js | Build scripts |

---

## 3. System Architecture

### Directory Structure

```
src/
├── index.html              # Main 3D VR visualization
├── tutorial_3d.html        # 3D tutorial with 4 practice nodes
├── 2d_visualization.html   # 2D Vis.js visualization
├── tutorial_2d.html        # 2D tutorial
├── lotr_positioned.json    # Pre-calculated 3D positions
├── lotr_graph.json         # Graph data for 2D
├── tutorial_graph.json     # Tutorial dataset
└── components/
    ├── graph-loader.js     # Loads and renders graph
    ├── graph-interaction.js # Hover/click interaction handling
    ├── info-panel.js       # HUD information panel
    └── vr-controls.js      # VR-specific input handling
```

### Component Dependency Graph

```
index.html
    └── A-Frame Scene
        ├── graph-loader.js
        │   └── Creates nodes, edges, labels
        │   └── Provides highlight methods
        ├── graph-interaction.js
        │   └── Handles mouse/VR events
        │   └── Calls graph-loader highlight methods
        ├── info-panel.js
        │   └── Creates HUD panel geometry
        └── vr-controls.js
            └── VR mode detection
            └── Gaze cursor for VR headsets
```

---

## 4. Data Processing Pipeline

### Step 1: Raw Data Sources

The original dataset comes from:
- `ontology.csv`: 76 entities with metadata (id, type, label, FreqSum, race, gender)
- `networks-id-3books.csv`: 1,444 edges with weights

### Step 2: Filtering (data_processor.py)

```python
# Filter to persons only
persons = ontology[ontology['type'] == 'per']

# Filter edges to only include person-to-person connections
person_ids = set(persons['id'])
filtered_edges = edges[
    (edges['source'].isin(person_ids)) &
    (edges['target'].isin(person_ids))
]
```

**Result**: 43 nodes, 450 edges

### Step 3: 3D Position Calculation (calculate_positions.py)

The Fruchterman-Reingold force-directed algorithm is used to compute node positions:

```python
import networkx as nx

# Create NetworkX graph
G = nx.Graph()
for node in nodes:
    G.add_node(node['id'], **node)
for edge in edges:
    G.add_edge(edge['source'], edge['target'], weight=edge['weight'])

# Calculate 3D positions using Fruchterman-Reingold
pos = nx.fruchterman_reingold_layout(
    G,
    dim=3,           # 3D layout
    k=2.0,           # Optimal node distance
    iterations=100,  # Convergence iterations
    scale=10.0       # Output scale
)

# Add positions to node data
for node_id, (x, y, z) in pos.items():
    node_data[node_id]['x'] = x
    node_data[node_id]['y'] = y
    node_data[node_id]['z'] = z
```

**Key Parameters**:
- `dim=3`: Generates 3D coordinates
- `k=2.0`: Controls spacing between nodes (higher = more spread)
- `scale=10.0`: Final coordinate scaling for A-Frame units

### Step 4: JSON Output

Two JSON files are generated:

**lotr_positioned.json** (for 3D):
```json
{
  "metadata": {
    "node_count": 43,
    "edge_count": 450,
    "max_edge_weight": 533
  },
  "nodes": [
    {
      "id": "frod",
      "label": "Frodo",
      "race": "hobbit",
      "gender": "male",
      "weight": 2258,
      "x": -1.234,
      "y": 2.456,
      "z": 0.789
    }
  ],
  "links": [
    {"source": "frod", "target": "sam", "weight": 533}
  ]
}
```

**lotr_graph.json** (for 2D):
Same structure without x, y, z coordinates (Vis.js calculates positions dynamically).

---

## 5. 3D VR Visualization (A-Frame)

### 5.1 A-Frame Component Architecture

A-Frame uses an entity-component-system (ECS) pattern. Custom components are registered as:

```javascript
AFRAME.registerComponent('component-name', {
    schema: {
        // Property definitions with types and defaults
        propertyName: { type: 'string', default: 'value' }
    },

    init: function() {
        // Called once when component is attached
        // Setup, bind event handlers
    },

    update: function(oldData) {
        // Called when schema properties change
    },

    remove: function() {
        // Cleanup when component is removed
    }
});
```

### 5.2 graph-loader.js - Graph Rendering

**Purpose**: Loads JSON data and creates 3D scene elements.

**Key Methods**:

```javascript
// Load and parse graph data
loadGraph: async function() {
    const response = await fetch(this.data.src);
    const data = await response.json();

    // Store globally for other components
    window.graphData = {
        nodes: data.nodes,
        links: data.links,
        nodeMap: {}  // id -> node lookup
    };

    this.createNodes(data.nodes);
    this.createEdges(data.links, data.nodes);
}

// Create node spheres
createNodes: function(nodes) {
    nodes.forEach(node => {
        const nodeEl = document.createElement('a-sphere');
        nodeEl.setAttribute('position', `${node.x} ${node.y} ${node.z}`);
        nodeEl.setAttribute('radius', calculateRadius(node.weight));
        nodeEl.setAttribute('color', RACE_COLORS[node.race]);
        nodeEl.setAttribute('class', 'raycastable graph-node');
        nodeEl.setAttribute('data-node-id', node.id);

        // Performance optimizations
        nodeEl.setAttribute('segments-width', 12);  // Low-poly sphere
        nodeEl.setAttribute('segments-height', 8);

        container.appendChild(nodeEl);
    });
}
```

**Node Sizing Algorithm**:
```javascript
// Normalize weight to [0, 1] range
const normalizedWeight = (node.weight - minWeight) / (maxWeight - minWeight);

// Map to size range [minNodeSize, maxNodeSize]
const nodeSize = minNodeSize + normalizedWeight * (maxNodeSize - minNodeSize);
```

**Edge Rendering**:
```javascript
// Edges use A-Frame's line component
edgeEl.setAttribute('line', {
    start: `${sourceNode.x} ${sourceNode.y} ${sourceNode.z}`,
    end: `${targetNode.x} ${targetNode.y} ${targetNode.z}`,
    color: '#888888',
    opacity: 0.2 + (weight / maxWeight) * 0.6  // Weight-based opacity
});
```

### 5.3 graph-interaction.js - User Interaction

**Purpose**: Handles hover and click events on nodes.

**Interaction Model**:
| Action | Visual Feedback | Info Display |
|--------|-----------------|--------------|
| Hover | White/light grey highlight on node + connections | Shows info panel |
| Click | Blue highlight on node + connections | No info panel |
| Click empty | Reset all highlights | Hide info panel |

**Hover Highlighting**:
```javascript
highlightNodeHover: function(nodeId) {
    // Get connected nodes
    const connectedIds = new Set([nodeId]);
    window.graphData.links.forEach(link => {
        if (link.source === nodeId) connectedIds.add(link.target);
        if (link.target === nodeId) connectedIds.add(link.source);
    });

    // Highlight hovered node (white glow)
    nodeEl.setAttribute('material', 'emissive', '#ffffff');
    nodeEl.setAttribute('material', 'emissiveIntensity', 0.4);

    // Highlight connected nodes (light grey)
    connectedNodeEl.setAttribute('material', 'emissive', '#aaaaaa');

    // Dim unconnected nodes
    unconnectedNodeEl.setAttribute('material', 'opacity', 0.6);

    // Highlight connected edges (white)
    edgeEl.setAttribute('line', 'color', '#ffffff');
}
```

**Click Highlighting**:
```javascript
highlightNode: function(nodeId) {
    // Similar logic but uses blue (#046de7) instead of white
    nodeEl.setAttribute('material', 'color', HIGHLIGHT_COLOR);
    edgeEl.setAttribute('line', 'color', HIGHLIGHT_COLOR);
}
```

### 5.4 info-panel.js - HUD Display

**Purpose**: Creates a heads-up display panel attached to the camera.

**Panel Structure**:
```javascript
// Panel is a child of the camera entity
// Position relative to camera (always in view)
<a-entity id="info-panel" position="0.55 -0.15 -1.2">
    <!-- Background plane -->
    <a-plane color="#1e1e32" opacity="0.9"></a-plane>

    <!-- Text elements -->
    <a-text id="panel-name" value="Character Name"></a-text>
    <a-text id="panel-race" value="Race"></a-text>
    <!-- ... -->
</a-entity>
```

### 5.5 vr-controls.js - VR Input Handling

**Purpose**: Detect VR mode and provide appropriate input methods.

**VR Mode Detection**:
```javascript
AFRAME.registerComponent('vr-mode-handler', {
    init: function() {
        const scene = document.querySelector('a-scene');

        scene.addEventListener('enter-vr', () => {
            // Show VR-specific cursor (gaze-based)
            document.getElementById('vr-gaze-cursor').setAttribute('visible', true);
        });

        scene.addEventListener('exit-vr', () => {
            // Hide VR cursor
            document.getElementById('vr-gaze-cursor').setAttribute('visible', false);
        });
    }
});
```

**Gaze Cursor Component**:
```javascript
// Fuse-based selection (look at node for 1.5s to select)
AFRAME.registerComponent('gaze-cursor', {
    schema: {
        fuseTimeout: { default: 1500 },
        cursorColor: { default: '#8ACAE5' }
    },

    init: function() {
        this.createCursor();
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
    }
});
```

---

## 6. 2D Visualization (Vis.js)

### 6.1 Network Configuration

```javascript
const options = {
    nodes: {
        shape: 'dot',
        font: { color: 'white' },
        borderWidth: 2
    },
    edges: {
        color: { color: '#888888' },
        smooth: { type: 'continuous' }
    },
    physics: {
        solver: 'barnesHut',
        barnesHut: {
            gravitationalConstant: -5000,
            centralGravity: 0,
            springLength: 200,
            springConstant: 0.009,
            damping: 0.025
        },
        stabilization: {
            iterations: 200,
            fit: true
        }
    }
};
```

### 6.2 Dynamic Layout

Unlike the 3D version, the 2D visualization calculates positions in real-time using the Barnes-Hut force simulation. The algorithm runs until stabilization (200 iterations) then stops for performance.

---

## 7. Interaction Design

### 7.1 Desktop Controls (3D)

| Input | Action |
|-------|--------|
| WASD | Move camera (fly mode) |
| Mouse move | Look around |
| Mouse hover on node | Show info + white highlight |
| Mouse click on node | Blue highlight (persistent) |
| Click empty space | Reset highlights |

### 7.2 VR Controls

| Input | Action |
|-------|--------|
| Head movement | Look around |
| Gaze at node (1.5s) | Show info + highlight |
| Controller trigger | Select/highlight node |
| Laser pointer | Aim at nodes |

### 7.3 Desktop Controls (2D)

| Input | Action |
|-------|--------|
| Scroll | Zoom in/out |
| Click + drag background | Pan view |
| Click + drag node | Move node |
| Hover on node | Show tooltip |
| Click on node | Highlight connections |

---

## 8. Visual Design Decisions

### 8.1 Color Scheme

Following the reference paper's dark aesthetic:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark grey | #222222 |
| Men | Blue-purple | #7A84DD |
| Elves | Light blue | #8ACAE5 |
| Hobbits | Brown | #BD9267 |
| Dwarves | Red-brown | #B15B60 |
| Ainur (Wizards) | Teal | #3A7575 |
| Ents | Orange | #E3845D |
| Orcs | Near black | #020104 |
| Highlight | Bright blue | #046de7 |
| Edges (default) | Grey | #888888 |
| Edges (highlighted) | White/Blue | #ffffff / #046de7 |

### 8.2 Node Sizing

Node radius is proportional to the character's total interaction weight:
- Minimum size: 0.15 A-Frame units
- Maximum size: 0.6 A-Frame units
- Linear interpolation based on normalized weight

### 8.3 Edge Opacity

Edge opacity is proportional to connection weight:
- Minimum opacity: 0.2 (for weak connections)
- Maximum opacity: 0.8 (for strong connections like Frodo-Sam)

### 8.4 Labels

- Billboard effect: Labels always face the camera
- Font: Roboto MSDF (optimized for 3D rendering)
- Color: White for visibility against dark background
- Position: Slightly above each node

---

## 9. Deployment

### 9.1 Build Process

```bash
node build.js
```

Copies `src/` files to `dist/` for deployment. No bundling required since all code is vanilla JavaScript loading from CDN.

### 9.2 GitHub Pages Deployment

```bash
# Push source to main branch
git add -A && git commit -m "message" && git push origin main

# Deploy dist folder to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

### 9.3 Live URLs

- 3D VR Visualization: `https://[username].github.io/A-Frame-Knowledge-Graph-Visualization/`
- 3D Tutorial: `https://[username].github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_3d.html`
- 2D Visualization: `https://[username].github.io/A-Frame-Knowledge-Graph-Visualization/2d_visualization.html`
- 2D Tutorial: `https://[username].github.io/A-Frame-Knowledge-Graph-Visualization/tutorial_2d.html`

---

## Appendix: Performance Optimizations

1. **Low-poly spheres**: Reduced segment count (12x8 instead of default 36x18)
2. **Flat shading**: Reduces lighting calculations
3. **Frustum culling**: Nodes outside camera view are not rendered
4. **Pre-calculated positions**: 3D layout computed once in Python, not at runtime
5. **Static edges**: No dynamic edge updates during interaction
6. **Opacity-based highlighting**: Uses material properties instead of geometry changes
