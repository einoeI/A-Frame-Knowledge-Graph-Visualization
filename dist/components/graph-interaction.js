/**
 * Graph Interaction Component for A-Frame
 * Handles hover and click interactions for graph nodes
 *
 * Hover: Shows info panel + highlights connections in white/light grey
 * Click: Highlights node and connections in blue (persistent, no info panel)
 * While clicked: Can hover other nodes to see their connections in white/grey
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
        this.onBackgroundHover = this.onBackgroundHover.bind(this);
        this.onGraphLoaded = this.onGraphLoaded.bind(this);

        // Wait for graph to load
        this.el.addEventListener('graph-loaded', this.onGraphLoaded);
    },

    onGraphLoaded: function (evt) {
        // Get reference to graph-loader component
        const graphContainer = document.getElementById(this.data.graphContainerId);
        if (graphContainer) {
            this.graphLoader = graphContainer.components['graph-loader'];
        }

        // Get info panel
        this.infoPanel = document.getElementById(this.data.infoPanelId);

        // Setup event listeners for all nodes
        this.setupNodeListeners();

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

        // Add canvas-level click handler as fallback for deselection
        const scene = document.querySelector('a-scene');
        if (scene) {
            this.onCanvasClick = this.onCanvasClick.bind(this);
            scene.canvas.addEventListener('click', this.onCanvasClick);
        }
    },

    onCanvasClick: function (evt) {
        // Use a small delay to let node clicks process first
        setTimeout(() => {
            // If no node was clicked (hoveredNodeId would be set by mouseenter before click)
            // and we have a selection, check if we should deselect
            if (this.selectedNodeId && !this.hoveredNodeId) {
                this.deselectNode();
            }
        }, 10);
    },

    setupNodeListeners: function () {
        const nodes = document.querySelectorAll('.graph-node');

        nodes.forEach(nodeEl => {
            nodeEl.addEventListener('mouseenter', this.onNodeMouseEnter);
            nodeEl.addEventListener('mouseleave', this.onNodeMouseLeave);
            nodeEl.addEventListener('click', this.onNodeClick);
        });
    },

    onBackgroundHover: function (evt) {
        // When cursor moves to background, clear hover effects
        if (this.hoveredNodeId) {
            // Reset the hovered node's scale
            const nodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(this.hoveredNodeId) : null;
            if (nodeEl) {
                nodeEl.setAttribute('scale', '1 1 1');
            }
            this.hoveredNodeId = null;
        }

        // Hide info panel
        this.hideInfoPanel();

        // Restore selection highlight if something is selected, otherwise reset all
        if (this.selectedNodeId) {
            if (this.graphLoader) {
                this.graphLoader.highlightNode(this.selectedNodeId);
            }
        } else {
            if (this.graphLoader) {
                this.graphLoader.resetHighlight();
            }
        }
    },

    onNodeMouseEnter: function (evt) {
        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // Don't re-trigger if already hovering this node
        if (this.hoveredNodeId === nodeId) return;

        // Don't apply hover effects to the selected node itself
        if (this.selectedNodeId === nodeId) return;

        // Reset previous hovered node's scale (if different from selected)
        if (this.hoveredNodeId && this.hoveredNodeId !== this.selectedNodeId) {
            const prevNodeEl = this.graphLoader ? this.graphLoader.getNodeEntity(this.hoveredNodeId) : null;
            if (prevNodeEl) {
                prevNodeEl.setAttribute('scale', '1 1 1');
            }
        }

        // Set new hover
        this.hoveredNodeId = nodeId;

        // Scale up the hovered node
        nodeEl.setAttribute('scale', '1.2 1.2 1.2');

        // Apply highlighting based on whether something is selected
        if (this.selectedNodeId) {
            // Something is selected - show both blue (selected) and white (hovered)
            if (this.graphLoader) {
                this.graphLoader.highlightWithHover(this.selectedNodeId, nodeId);
            }
        } else {
            // Nothing selected - just show hover highlight (white/grey)
            if (this.graphLoader) {
                this.graphLoader.highlightNodeHover(nodeId);
            }
        }

        // Show info panel for hovered node
        this.showInfoPanel(nodeId);
    },

    onNodeMouseLeave: function (evt) {
        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // Only process if this was the hovered node
        if (this.hoveredNodeId !== nodeId) return;

        // Reset scale
        nodeEl.setAttribute('scale', '1 1 1');

        // Clear hover tracking
        this.hoveredNodeId = null;

        // Hide info panel
        this.hideInfoPanel();

        // Restore state based on selection
        if (this.selectedNodeId) {
            // Restore selection highlight
            if (this.graphLoader) {
                this.graphLoader.highlightNode(this.selectedNodeId);
            }
        } else {
            // Reset everything
            if (this.graphLoader) {
                this.graphLoader.resetHighlight();
            }
        }
    },

    onNodeClick: function (evt) {
        evt.stopPropagation();

        const nodeEl = evt.target;
        const nodeId = nodeEl.getAttribute('data-node-id');

        if (!nodeId) return;

        // Clear hover state
        if (this.hoveredNodeId) {
            const hoveredEl = this.graphLoader ? this.graphLoader.getNodeEntity(this.hoveredNodeId) : null;
            if (hoveredEl) {
                hoveredEl.setAttribute('scale', '1 1 1');
            }
            this.hoveredNodeId = null;
        }
        this.hideInfoPanel();

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
            background.removeEventListener('mouseenter', this.onBackgroundHover);
        }

        const sky = document.querySelector('a-sky');
        if (sky) {
            sky.removeEventListener('click', this.onBackgroundClick);
            sky.removeEventListener('mouseenter', this.onBackgroundHover);
        }
    }
});
