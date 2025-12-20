/**
 * Graph Loader Component for A-Frame
 * Loads LOTR character network from pre-positioned JSON
 * Creates 3D nodes, edges, and labels
 */

/* global AFRAME, THREE */

// Race colors (same as 2D visualization)
const RACE_COLORS = {
    'men': '#7A84DD',
    'elves': '#8ACAE5',
    'hobbit': '#BD9267',
    'dwarf': '#B15B60',
    'ainur': '#3A7575',
    'ents': '#E3845D',
    'orcs': '#020104',
    'animal': '#8ACAE5'
};

// Highlight color
const HIGHLIGHT_COLOR = '#046de7';

// Store global graph data for other components
window.graphData = {
    nodes: [],
    links: [],
    nodeMap: {},
    metadata: null
};

AFRAME.registerComponent('graph-loader', {
    schema: {
        src: { type: 'string', default: './lotr_positioned.json' },
        nodeScale: { type: 'number', default: 0.03 },  // Scale factor for node sizes
        minNodeSize: { type: 'number', default: 0.15 },
        maxNodeSize: { type: 'number', default: 0.6 },
        edgeColor: { type: 'color', default: '#888888' },
        edgeOpacity: { type: 'number', default: 0.4 },
        showLabels: { type: 'boolean', default: true },
        labelScale: { type: 'number', default: 0.8 },
        // Performance options
        lowPoly: { type: 'boolean', default: true },       // Use low-poly spheres
        segmentsWidth: { type: 'number', default: 12 },    // Sphere horizontal segments
        segmentsHeight: { type: 'number', default: 8 },    // Sphere vertical segments
        enableFrustumCulling: { type: 'boolean', default: true }
    },

    init: function () {
        this.nodes = [];
        this.edges = [];
        this.nodeEntities = {};
        this.edgeEntities = [];
        this.labelEntities = {};

        this.loadGraph();
    },

    loadGraph: async function () {
        try {
            // Add cache-busting parameter to prevent stale data
            const url = this.data.src + '?v=' + Date.now();
            console.log('[GraphLoader] Loading graph from:', this.data.src);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Store globally for other components
            window.graphData.nodes = data.nodes;
            window.graphData.links = data.links;
            window.graphData.metadata = data.metadata;

            // Create node lookup map and store colors
            data.nodes.forEach(node => {
                node.color = RACE_COLORS[node.race] || '#7A84DD';
                window.graphData.nodeMap[node.id] = node;
            });

            console.log('[GraphLoader] Loaded:', data.metadata);
            console.log('[GraphLoader] Nodes:', data.nodes.length);
            console.log('[GraphLoader] Edges:', data.links.length);

            // Create graph elements
            this.createNodes(data.nodes);
            this.createEdges(data.links, data.nodes);

            // Emit event when graph is loaded
            this.el.emit('graph-loaded', {
                nodeCount: data.nodes.length,
                edgeCount: data.links.length
            });

        } catch (error) {
            console.error('[GraphLoader] Error loading graph:', error);
            this.el.emit('graph-error', { error: error.message });
        }
    },

    createNodes: function (nodes) {
        const container = this.el;

        // Calculate size range
        const weights = nodes.map(n => n.weight);
        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);

        nodes.forEach(node => {
            // Calculate node size based on weight
            const normalizedWeight = (node.weight - minWeight) / (maxWeight - minWeight);
            const nodeSize = this.data.minNodeSize +
                normalizedWeight * (this.data.maxNodeSize - this.data.minNodeSize);

            // Get race color
            const color = RACE_COLORS[node.race] || '#7A84DD';

            // Create node sphere with performance optimizations
            const nodeEl = document.createElement('a-sphere');
            nodeEl.setAttribute('position', `${node.x} ${node.y} ${node.z}`);
            nodeEl.setAttribute('radius', nodeSize);
            nodeEl.setAttribute('color', color);
            nodeEl.setAttribute('class', 'raycastable graph-node');
            nodeEl.setAttribute('data-node-id', node.id);
            nodeEl.setAttribute('data-node-label', node.label);
            nodeEl.setAttribute('data-node-race', node.race);
            nodeEl.setAttribute('data-node-color', color);

            // Performance: Use lower polygon count for spheres
            if (this.data.lowPoly) {
                nodeEl.setAttribute('segments-width', this.data.segmentsWidth);
                nodeEl.setAttribute('segments-height', this.data.segmentsHeight);
            }

            // Add metallic material for better VR appearance
            nodeEl.setAttribute('material', {
                color: color,
                metalness: 0.3,
                roughness: 0.7,
                flatShading: this.data.lowPoly  // Flat shading for performance
            });

            // Performance: Enable frustum culling
            if (this.data.enableFrustumCulling) {
                nodeEl.addEventListener('loaded', () => {
                    if (nodeEl.object3D) {
                        nodeEl.object3D.frustumCulled = true;
                    }
                });
            }

            // Store reference
            this.nodeEntities[node.id] = nodeEl;

            // Add to scene
            container.appendChild(nodeEl);

            // Create label if enabled
            if (this.data.showLabels) {
                this.createLabel(node, nodeEl, nodeSize);
            }
        });

        console.log('[GraphLoader] Created', Object.keys(this.nodeEntities).length, 'nodes');
    },

    createLabel: function (node, parentEl, nodeSize) {
        const labelEl = document.createElement('a-text');

        // Position label above the node
        labelEl.setAttribute('value', node.label);
        labelEl.setAttribute('position', `0 ${nodeSize + 0.15} 0`);
        labelEl.setAttribute('align', 'center');
        labelEl.setAttribute('color', 'white');
        labelEl.setAttribute('scale', `${this.data.labelScale} ${this.data.labelScale} ${this.data.labelScale}`);
        labelEl.setAttribute('look-at', '[camera]');  // Billboard effect
        labelEl.setAttribute('class', 'node-label');
        labelEl.setAttribute('data-node-id', node.id);

        // Add slight background for readability
        labelEl.setAttribute('shader', 'msdf');
        labelEl.setAttribute('font', 'https://cdn.aframe.io/fonts/Roboto-msdf.json');

        parentEl.appendChild(labelEl);
        this.labelEntities[node.id] = labelEl;
    },

    createEdges: function (links, nodes) {
        const container = this.el;
        const nodeMap = {};
        nodes.forEach(n => nodeMap[n.id] = n);

        // Calculate max weight for opacity scaling
        const maxWeight = Math.max(...links.map(l => l.weight));

        links.forEach((link, index) => {
            const sourceNode = nodeMap[link.source];
            const targetNode = nodeMap[link.target];

            if (!sourceNode || !targetNode) {
                console.warn('[GraphLoader] Missing node for edge:', link);
                return;
            }

            // Calculate opacity based on weight
            const opacity = 0.2 + (link.weight / maxWeight) * 0.6;

            // Create edge using a-entity with line component
            const edgeEl = document.createElement('a-entity');
            edgeEl.setAttribute('line', {
                start: `${sourceNode.x} ${sourceNode.y} ${sourceNode.z}`,
                end: `${targetNode.x} ${targetNode.y} ${targetNode.z}`,
                color: this.data.edgeColor,
                opacity: opacity
            });
            edgeEl.setAttribute('class', 'graph-edge');
            edgeEl.setAttribute('data-source', link.source);
            edgeEl.setAttribute('data-target', link.target);
            edgeEl.setAttribute('data-weight', link.weight);
            edgeEl.setAttribute('data-edge-index', index);

            this.edgeEntities.push(edgeEl);
            container.appendChild(edgeEl);
        });

        console.log('[GraphLoader] Created', this.edgeEntities.length, 'edges');
    },

    // Public method to highlight a node and its connections
    highlightNode: function (nodeId) {
        const node = window.graphData.nodeMap[nodeId];
        if (!node) return;

        // Get connected node IDs
        const connectedIds = new Set([nodeId]);
        window.graphData.links.forEach(link => {
            if (link.source === nodeId) connectedIds.add(link.target);
            if (link.target === nodeId) connectedIds.add(link.source);
        });

        // Update node appearances
        Object.keys(this.nodeEntities).forEach(id => {
            const nodeEl = this.nodeEntities[id];
            const nodeData = window.graphData.nodeMap[id];

            if (id === nodeId) {
                // Selected node - highlight color
                nodeEl.setAttribute('material', 'color', HIGHLIGHT_COLOR);
                nodeEl.setAttribute('material', 'emissive', HIGHLIGHT_COLOR);
                nodeEl.setAttribute('material', 'emissiveIntensity', 0.3);
            } else if (connectedIds.has(id)) {
                // Connected node - keep original color, full opacity
                nodeEl.setAttribute('material', 'color', nodeData.color);
                nodeEl.setAttribute('material', 'opacity', 1);
            } else {
                // Unconnected node - dim
                nodeEl.setAttribute('material', 'color', '#444444');
                nodeEl.setAttribute('material', 'opacity', 0.3);
            }
        });

        // Update edge appearances
        this.edgeEntities.forEach(edgeEl => {
            const source = edgeEl.getAttribute('data-source');
            const target = edgeEl.getAttribute('data-target');

            if (source === nodeId || target === nodeId) {
                // Connected edge - highlight
                edgeEl.setAttribute('line', 'color', HIGHLIGHT_COLOR);
                edgeEl.setAttribute('line', 'opacity', 0.9);
            } else {
                // Unconnected edge - dim
                edgeEl.setAttribute('line', 'color', '#333333');
                edgeEl.setAttribute('line', 'opacity', 0.1);
            }
        });

        // Update label visibility
        Object.keys(this.labelEntities).forEach(id => {
            const labelEl = this.labelEntities[id];
            if (connectedIds.has(id)) {
                labelEl.setAttribute('visible', true);
                labelEl.setAttribute('opacity', 1);
            } else {
                labelEl.setAttribute('opacity', 0.2);
            }
        });
    },

    // Public method to reset highlights
    resetHighlight: function () {
        // Reset nodes
        Object.keys(this.nodeEntities).forEach(id => {
            const nodeEl = this.nodeEntities[id];
            const nodeData = window.graphData.nodeMap[id];
            const color = nodeData ? nodeData.color : '#7A84DD';

            nodeEl.setAttribute('material', 'color', color);
            nodeEl.setAttribute('material', 'opacity', 1);
            nodeEl.setAttribute('material', 'emissive', '#000000');
            nodeEl.setAttribute('material', 'emissiveIntensity', 0);
        });

        // Reset edges
        this.edgeEntities.forEach(edgeEl => {
            const weight = parseFloat(edgeEl.getAttribute('data-weight'));
            const maxWeight = window.graphData.metadata?.max_edge_weight || 533;
            const opacity = 0.2 + (weight / maxWeight) * 0.6;

            edgeEl.setAttribute('line', 'color', this.data.edgeColor);
            edgeEl.setAttribute('line', 'opacity', opacity);
        });

        // Reset labels
        Object.keys(this.labelEntities).forEach(id => {
            const labelEl = this.labelEntities[id];
            labelEl.setAttribute('visible', true);
            labelEl.setAttribute('opacity', 1);
        });
    },

    // Get node entity by ID
    getNodeEntity: function (nodeId) {
        return this.nodeEntities[nodeId];
    },

    // Get all node entities
    getAllNodeEntities: function () {
        return this.nodeEntities;
    },

    // Get all edge entities
    getAllEdgeEntities: function () {
        return this.edgeEntities;
    }
});

console.log('[GraphLoader] Component registered');
