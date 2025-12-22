/**
 * VR Controls Component for A-Frame
 * Joystick movement, hand controller interaction, no gaze
 */

/* global AFRAME, THREE */

/**
 * Thumbstick Movement Component
 * Fly around using controller thumbsticks, direction based on head orientation
 */
AFRAME.registerComponent('thumbstick-movement', {
    schema: {
        speed: { type: 'number', default: 3 },
        cameraRig: { type: 'selector', default: '#cameraRig' },
        camera: { type: 'selector', default: '#camera' }
    },

    init: function () {
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        // Bind handlers
        this.onThumbstickMoved = this.onThumbstickMoved.bind(this);

        // Track thumbstick state
        this.thumbstickX = 0;
        this.thumbstickY = 0;

        // Listen for thumbstick events on this controller
        this.el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
    },

    onThumbstickMoved: function (evt) {
        this.thumbstickX = evt.detail.x;
        this.thumbstickY = evt.detail.y;
    },

    tick: function (time, deltaTime) {
        if (!this.data.cameraRig || !this.data.camera) return;

        // Only move if thumbstick is being used
        if (Math.abs(this.thumbstickX) < 0.1 && Math.abs(this.thumbstickY) < 0.1) {
            return;
        }

        const dt = deltaTime / 1000; // Convert to seconds
        const speed = this.data.speed;

        // Get camera world direction (where user is looking)
        const camera = this.data.camera.object3D;
        const cameraRig = this.data.cameraRig.object3D;

        // Get forward direction from camera
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0; // Keep movement horizontal for comfort
        forward.normalize();

        // Get right direction
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        // Calculate movement vector
        // thumbstickY negative = forward, positive = backward
        // thumbstickX positive = right, negative = left
        this.velocity.set(0, 0, 0);
        this.velocity.addScaledVector(forward, -this.thumbstickY * speed * dt);
        this.velocity.addScaledVector(right, this.thumbstickX * speed * dt);

        // Apply movement to camera rig
        cameraRig.position.add(this.velocity);
    },

    remove: function () {
        this.el.removeEventListener('thumbstickmoved', this.onThumbstickMoved);
    }
});


/**
 * Hand Interaction Component
 * Makes hand controllers work for hover and click on nodes
 */
AFRAME.registerComponent('hand-interaction', {
    schema: {
        hand: { type: 'string', default: 'right' }
    },

    init: function () {
        this.hoveredNode = null;

        // Bind handlers
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        this.onTriggerDown = this.onTriggerDown.bind(this);

        // Listen for raycaster events
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        // Listen for trigger
        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onTriggerDown);
    },

    onIntersection: function (evt) {
        const intersectedEls = evt.detail.els;

        // Find the first graph node
        for (let i = 0; i < intersectedEls.length; i++) {
            const el = intersectedEls[i];
            if (el.classList.contains('graph-node')) {
                if (this.hoveredNode !== el) {
                    // Leave previous node
                    if (this.hoveredNode) {
                        this.hoveredNode.emit('mouseleave');
                    }
                    // Enter new node
                    this.hoveredNode = el;
                    el.emit('mouseenter');
                }
                return;
            }
        }

        // No graph node found, clear hover
        if (this.hoveredNode) {
            this.hoveredNode.emit('mouseleave');
            this.hoveredNode = null;
        }
    },

    onIntersectionCleared: function (evt) {
        // Check if the cleared element was our hovered node
        const clearedEl = evt.detail.clearedEls ? evt.detail.clearedEls[0] : null;

        if (this.hoveredNode && (!clearedEl || clearedEl === this.hoveredNode)) {
            this.hoveredNode.emit('mouseleave');
            this.hoveredNode = null;
        }
    },

    onTriggerDown: function (evt) {
        if (this.hoveredNode) {
            // Click on hovered node
            this.hoveredNode.emit('click');
        } else {
            // Click on background to reset selection
            const background = document.querySelector('#background');
            if (background) {
                background.emit('click');
            }
        }
    },

    remove: function () {
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onTriggerDown);
    }
});


/**
 * VR Mode Handler
 * Adjusts controls based on VR vs desktop mode
 */
AFRAME.registerComponent('vr-mode-handler', {
    init: function () {
        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);

        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.addEventListener('exit-vr', this.onExitVR);
    },

    onEnterVR: function () {
        // Disable WASD in VR (use thumbsticks instead)
        const camera = document.querySelector('[wasd-controls]');
        if (camera) {
            camera.setAttribute('wasd-controls', 'enabled', false);
        }

        // Show VR info panel
        const infoPanel = document.querySelector('#info-panel');
        if (infoPanel) {
            infoPanel.setAttribute('visible', false);
        }
    },

    onExitVR: function () {
        // Re-enable WASD for desktop
        const camera = document.querySelector('[wasd-controls]');
        if (camera) {
            camera.setAttribute('wasd-controls', 'enabled', true);
        }
    },

    remove: function () {
        this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR);
    }
});


/**
 * VR Boundary Component
 * Creates a visual boundary grid for spatial awareness
 */
AFRAME.registerComponent('vr-boundary', {
    schema: {
        size: { type: 'number', default: 40 },
        divisions: { type: 'number', default: 20 },
        color: { type: 'color', default: '#3A7575' }
    },

    init: function () {
        this.createBoundary();
    },

    createBoundary: function () {
        const size = this.data.size;
        const divisions = this.data.divisions;
        const color = this.data.color;

        // Floor grid
        const floorGrid = document.createElement('a-entity');
        floorGrid.setAttribute('id', 'floor-grid');
        floorGrid.setAttribute('position', '0 0 0');

        // Create grid lines using thin boxes
        const spacing = size / divisions;
        const halfSize = size / 2;

        // Create a grid helper using Three.js
        const gridHelper = new THREE.GridHelper(size, divisions, color, color);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;

        floorGrid.setObject3D('grid', gridHelper);
        this.el.appendChild(floorGrid);

        // Create boundary walls (transparent, just for reference)
        const wallHeight = 15;
        const wallOpacity = 0.05;

        // Front wall
        this.createWall(0, wallHeight/2, -halfSize, size, wallHeight, 0, color, wallOpacity);
        // Back wall
        this.createWall(0, wallHeight/2, halfSize, size, wallHeight, 0, color, wallOpacity);
        // Left wall
        this.createWall(-halfSize, wallHeight/2, 0, size, wallHeight, 90, color, wallOpacity);
        // Right wall
        this.createWall(halfSize, wallHeight/2, 0, size, wallHeight, 90, color, wallOpacity);

        // Corner pillars for better depth perception
        this.createPillar(-halfSize, 0, -halfSize, wallHeight, color);
        this.createPillar(halfSize, 0, -halfSize, wallHeight, color);
        this.createPillar(-halfSize, 0, halfSize, wallHeight, color);
        this.createPillar(halfSize, 0, halfSize, wallHeight, color);
    },

    createWall: function (x, y, z, width, height, rotationY, color, opacity) {
        const wall = document.createElement('a-plane');
        wall.setAttribute('position', `${x} ${y} ${z}`);
        wall.setAttribute('width', width);
        wall.setAttribute('height', height);
        wall.setAttribute('rotation', `0 ${rotationY} 0`);
        wall.setAttribute('material', `color: ${color}; opacity: ${opacity}; transparent: true; side: double`);
        this.el.appendChild(wall);
    },

    createPillar: function (x, y, z, height, color) {
        const pillar = document.createElement('a-box');
        pillar.setAttribute('position', `${x} ${y + height/2} ${z}`);
        pillar.setAttribute('width', 0.2);
        pillar.setAttribute('height', height);
        pillar.setAttribute('depth', 0.2);
        pillar.setAttribute('material', `color: ${color}; opacity: 0.5; transparent: true`);
        this.el.appendChild(pillar);
    }
});
