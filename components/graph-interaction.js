/**
 * Graph Interaction Component for A-Frame
 * Handles hover and click interactions for graph nodes
 *
 * Hover: Shows info panel + highlights connections in white/light grey
 * Click: Highlights node and connections in blue (no info panel)
 */

/* global AFRAME */

// Race display names (same as 2D)
const RACE_NAMES = {
    'men': 'Men',
    'elves': 'Elves',
    'hobbit': 'Hobbit',
    'dwarf': 'Dwarf',
    'ainur': 'Ainur',
    'ents': 'Ent',
    'orcs': 'Orc',
    'animal': 'Animal'
};

AFRAME.registerComponent('graph-interaction', {
    schema: {
        infoPanelId: { type: 'string', default: 'info-panel' },
        graphContainerId: { type: 'string', default: 'graph-container' }
    },

    init: function () {
        this.selectedNodeId = null;
        this.hoveredNodeId = null;
        this.graphLoader = null;
        this.infoPanel = null;

        // Bind event handlers
        this.onNodeMouseEnter = this.onNodeMouseEnter.bind(this);
        this.onNodeMouseLeave = this.onNodeMouseLeave.bind(this);
        this.onNodeClick = this.onNodeClick.bind(this);
        this.onBackgroundClick = this.onBackgroundClick.bind(this);
        this.onGraphLoaded = this.onGraphLoaded.bind(this);

        // Wait for graph to load
        this.el.addEventListener('graph-loaded', this.onGraphLoaded);
    },

    onGraphLoaded: function (evt) {
        console.log('[GraphInteraction] Graph loaded, setting up interactions');

        // Get reference to graph-loader component
        const graphContainer = document.getElementById(this.data.graphContainerId);
        if (graphContainer) {
            this.graphLoader = graphContainer.components['graph-loader'];
        }

        // Get info panel
        this.infoPanel = document.getElementById(this.data.infoPanelId);

        // Setup event listeners for all nodes
        this.setupNodeListeners();

        // Bind background hover handler
        this.onBackgroundHover = this.onBackgroundHover.bind(this);

        // Setup background click and hover to reset
        const background = document.querySelector('#background');
        if (background) {
            background.addEventListener('click', this.onBackgroundClick);
            background.addEventListener('mouseenter', this.onBackgroundHover);
        }

        // Also listen to sky click and hover
        const sky = document.querySelector('a-sky');
        if (sky) {
            sky.addEventListener('click', this.onBackgroundClick);
            sky.addEventListener('mouseenter', this.onBackgroundHover);
        }
    },

    onBackgroundHover: function (evt) {
        // When cursor moves to background, clear hover effects
        if (this.hoveredNodeId) {
            this.clearHoverEffects();
        }
    },

    setupNodeListeners: function () {
        const nodes = document.querySelectorAll('.graph-node');

        nodes.forEach(nodeEl => {
            nodeEl.addEventListener('mouseenter', this.onNodeMouseEnter);
            nodeEl.addEventListener('mouseleave', this.onNodeMouseLeave);
            nodeEl.addEventListener('click', this.onNodeClick);
        });

        console.log('[GraphInteraction] Set up listeners for', nodes.length, 'nodes');
    },

    onNodeMouseEnter: function (evt) {
        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // If a node is selected (clicked), don't change hover effects
        if (this.selectedNodeId) return;

        // Already hovering this node - ignore
        if (this.hoveredNodeId === nodeId) return;

        // Clear previous hover if any
        if (this.hoveredNodeId) {
            this.clearHoverEffects();
        }

        // Set new hover
        this.hoveredNodeId = nodeId;

        // Scale up the hovered node
        nodeEl.setAttribute('scale', '1.2 1.2 1.2');

        // Highlight connections in white/light grey
        if (this.graphLoader) {
            this.graphLoader.highlightNodeHover(nodeId);
        }

        // Show info panel
        this.showInfoPanel(nodeId);
    },

    onNodeMouseLeave: function (evt) {
        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // If a node is selected, don't change anything
        if (this.selectedNodeId) return;

        // Clear hover effects
        if (this.hoveredNodeId === nodeId) {
            this.clearHoverEffects();
        }
    },

    clearHoverEffects: function () {
        if (!this.hoveredNodeId) return;

        // Reset scale of hovered node
        const nodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(this.hoveredNodeId) : null;
        if (nodeEl) {
            nodeEl.setAttribute('scale', '1 1 1');
        }

        // Reset all highlights
        if (this.graphLoader) {
            this.graphLoader.resetHighlight();
        }

        // Hide info panel
        this.hideInfoPanel();

        this.hoveredNodeId = null;
    },

    onNodeClick: function (evt) {
        evt.stopPropagation();

        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // Toggle selection
        if (this.selectedNodeId === nodeId) {
            // Clicking same node - deselect
            this.deselectNode();
        } else {
            // Select new node
            this.selectNode(nodeId);
        }
    },

    onBackgroundClick: function (evt) {
        // Deselect if something is selected
        if (this.selectedNodeId) {
            this.deselectNode();
        }
    },

    selectNode: function (nodeId) {
        // Clear any hover effects first
        if (this.hoveredNodeId) {
            const nodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(this.hoveredNodeId) : null;
            if (nodeEl) {
                nodeEl.setAttribute('scale', '1 1 1');
            }
            this.hoveredNodeId = null;
        }

        // Hide info panel (click doesn't show info)
        this.hideInfoPanel();

        // If there was a previously selected node, reset first
        if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
            if (this.graphLoader) {
                this.graphLoader.resetHighlight();
            }
        }

        this.selectedNodeId = nodeId;

        // Highlight node and connections in blue
        if (this.graphLoader) {
            this.graphLoader.highlightNode(nodeId);
        }

        // Emit event
        this.el.emit('node-selected', { nodeId: nodeId });
    },

    deselectNode: function () {
        const prevNodeId = this.selectedNodeId;
        this.selectedNodeId = null;

        // Reset highlights
        if (this.graphLoader) {
            this.graphLoader.resetHighlight();
        }

        // Emit event
        this.el.emit('node-deselected', { nodeId: prevNodeId });
    },

    showInfoPanel: function (nodeId) {
        if (!this.infoPanel || !window.graphData.nodeMap) return;

        const node = window.graphData.nodeMap[nodeId];
        if (!node) return;

        // Get connections
        const connections = this.getNodeConnections(nodeId);

        // Update panel content
        const nameEl = this.infoPanel.querySelector('#panel-name');
        const raceEl = this.infoPanel.querySelector('#panel-race');
        const genderEl = this.infoPanel.querySelector('#panel-gender');
        const weightEl = this.infoPanel.querySelector('#panel-weight');
        const connectionsCountEl = this.infoPanel.querySelector('#panel-connections');
        const topConnectionsEl = this.infoPanel.querySelector('#panel-top-connections');

        // Set values
        if (nameEl) nameEl.setAttribute('value', node.label);
        if (raceEl) raceEl.setAttribute('value', RACE_NAMES[node.race] || node.race);
        if (genderEl) {
            const gender = node.gender ? node.gender.charAt(0).toUpperCase() + node.gender.slice(1) : '-';
            genderEl.setAttribute('value', gender);
        }
        if (weightEl) weightEl.setAttribute('value', node.weight.toString());
        if (connectionsCountEl) {
            const connCount = node.total_connections || connections.length;
            connectionsCountEl.setAttribute('value', connCount.toString());
        }

        // Top 5 connections
        if (topConnectionsEl) {
            const topConns = connections.slice(0, 5)
                .map(c => `${c.label} (${c.weight})`)
                .join('\n');
            topConnectionsEl.setAttribute('value', topConns || 'None');
        }

        // Show panel
        this.infoPanel.setAttribute('visible', true);
    },

    hideInfoPanel: function () {
        if (this.infoPanel) {
            this.infoPanel.setAttribute('visible', false);
        }
    },

    getNodeConnections: function (nodeId) {
        if (!window.graphData.links) return [];

        const connections = [];

        window.graphData.links.forEach(link => {
            if (link.source === nodeId) {
                const targetNode = window.graphData.nodeMap[link.target];
                if (targetNode) {
                    connections.push({
                        id: link.target,
                        label: targetNode.label,
                        weight: link.weight
                    });
                }
            } else if (link.target === nodeId) {
                const sourceNode = window.graphData.nodeMap[link.source];
                if (sourceNode) {
                    connections.push({
                        id: link.source,
                        label: sourceNode.label,
                        weight: link.weight
                    });
                }
            }
        });

        // Sort by weight descending
        return connections.sort((a, b) => b.weight - a.weight);
    },

    remove: function () {
        // Cleanup event listeners
        const nodes = document.querySelectorAll('.graph-node');
        nodes.forEach(nodeEl => {
            nodeEl.removeEventListener('mouseenter', this.onNodeMouseEnter);
            nodeEl.removeEventListener('mouseleave', this.onNodeMouseLeave);
            nodeEl.removeEventListener('click', this.onNodeClick);
        });

        const background = document.querySelector('#background');
        if (background) {
            background.removeEventListener('click', this.onBackgroundClick);
        }
    }
});

console.log('[GraphInteraction] Component registered');
