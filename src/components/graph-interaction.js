/**
 * Graph Interaction Component for A-Frame
 * Handles hover and click interactions for graph nodes
 * Shows info panel and highlights connections
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
        this.isHoverLocked = false;  // Prevents rapid hover changes

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
        // When cursor moves to background, clear hover visual effects
        if (this.hoveredNodeId && this.hoveredNodeId !== this.selectedNodeId) {
            this.resetNodeAppearance(this.hoveredNodeId);
        }
        this.hoveredNodeId = null;

        // If a node is selected, keep showing its info panel
        // Otherwise hide the info panel
        if (this.selectedNodeId) {
            this.showInfoPanel(this.selectedNodeId);
        } else {
            this.hideInfoPanel();
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

        // Already hovering this node - ignore
        if (this.hoveredNodeId === nodeId) return;

        // If hovering a different node, reset the previous one (but not if it's selected)
        if (this.hoveredNodeId && this.hoveredNodeId !== this.selectedNodeId) {
            this.resetNodeAppearance(this.hoveredNodeId);
        }

        // Set new hover
        this.hoveredNodeId = nodeId;

        // Only apply hover visual effects if this node is NOT selected
        if (nodeId !== this.selectedNodeId) {
            // Scale up
            nodeEl.setAttribute('scale', '1.2 1.2 1.2');

            // Add glow effect
            const nodeColor = nodeEl.getAttribute('data-node-color');
            nodeEl.setAttribute('material', 'emissive', nodeColor || '#ffffff');
            nodeEl.setAttribute('material', 'emissiveIntensity', 0.3);
        }

        // Always show info panel for hovered node
        this.showInfoPanel(nodeId);
    },

    onNodeMouseLeave: function (evt) {
        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // Reset hover appearance (but not if it's the selected node)
        if (nodeId !== this.selectedNodeId) {
            this.resetNodeAppearance(nodeId);
        }

        // Clear hover tracking
        if (this.hoveredNodeId === nodeId) {
            this.hoveredNodeId = null;
        }

        // Hide info panel only if no node is selected
        // If a node is selected, show its info instead
        if (this.selectedNodeId) {
            this.showInfoPanel(this.selectedNodeId);
        } else {
            this.hideInfoPanel();
        }
    },

    resetNodeAppearance: function (nodeId) {
        const nodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(nodeId) : null;
        if (!nodeEl) return;

        // Reset scale
        nodeEl.setAttribute('scale', '1 1 1');

        // If a node is selected, we need to restore to the highlight state
        // (dimmed if not connected, normal if connected)
        if (this.selectedNodeId) {
            // Check if this node is connected to the selected node
            const isConnected = this.isNodeConnected(nodeId, this.selectedNodeId);

            if (isConnected) {
                // Connected node - keep original color
                const nodeData = window.graphData.nodeMap[nodeId];
                nodeEl.setAttribute('material', 'color', nodeData?.color || '#7A84DD');
                nodeEl.setAttribute('material', 'opacity', 1);
                nodeEl.setAttribute('material', 'emissive', '#000000');
                nodeEl.setAttribute('material', 'emissiveIntensity', 0);
            } else {
                // Unconnected node - dimmed
                nodeEl.setAttribute('material', 'color', '#444444');
                nodeEl.setAttribute('material', 'opacity', 0.3);
                nodeEl.setAttribute('material', 'emissive', '#000000');
                nodeEl.setAttribute('material', 'emissiveIntensity', 0);
            }
        } else {
            // No selection - restore to original color
            const nodeData = window.graphData.nodeMap[nodeId];
            nodeEl.setAttribute('material', 'color', nodeData?.color || '#7A84DD');
            nodeEl.setAttribute('material', 'opacity', 1);
            nodeEl.setAttribute('material', 'emissive', '#000000');
            nodeEl.setAttribute('material', 'emissiveIntensity', 0);
        }
    },

    isNodeConnected: function (nodeId, selectedNodeId) {
        if (nodeId === selectedNodeId) return true;

        return window.graphData.links.some(link =>
            (link.source === selectedNodeId && link.target === nodeId) ||
            (link.target === selectedNodeId && link.source === nodeId)
        );
    },

    clearHover: function () {
        if (this.hoveredNodeId) {
            this.resetNodeAppearance(this.hoveredNodeId);
            this.hoveredNodeId = null;
            this.hideInfoPanel();
        }
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
        // Clear any hover state
        this.clearHover();

        // Deselect if something is selected
        if (this.selectedNodeId) {
            this.deselectNode();
        }
    },

    selectNode: function (nodeId) {
        // If there was a previously selected node, deselect it first
        if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
            // Reset previous selection
            if (this.graphLoader) {
                this.graphLoader.resetHighlight();
            }
        }

        // Clear any hover state on the node we're about to select
        if (this.hoveredNodeId === nodeId) {
            const nodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(nodeId) : null;
            if (nodeEl) {
                nodeEl.setAttribute('scale', '1 1 1');
            }
        }

        this.selectedNodeId = nodeId;
        this.hoveredNodeId = null;  // Clear hover since we're now selecting

        // Highlight node and connections (turns node blue)
        if (this.graphLoader) {
            this.graphLoader.highlightNode(nodeId);
        }

        // Show info panel
        this.showInfoPanel(nodeId);

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

        // Hide info panel
        this.hideInfoPanel();

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

        // Set values (matching 2D visualization)
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

        // Top 5 connections (matching 2D)
        if (topConnectionsEl) {
            const topConns = connections.slice(0, 5)
                .map(c => `${c.label} (${c.weight})`)
                .join('\n');
            topConnectionsEl.setAttribute('value', topConns || 'None');
        }

        // Show panel (it's now a HUD element attached to camera)
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

    capitalizeFirst: function (str) {
        if (!str) return '-';
        return str.charAt(0).toUpperCase() + str.slice(1);
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
