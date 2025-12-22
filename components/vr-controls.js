/**
 * VR Controls Component for A-Frame
 * Joystick movement, hand controller interaction
 */

/* global AFRAME, THREE */

/**
 * Thumbstick Movement Component (Left Controller)
 * Move forward/backward based on head direction
 */
AFRAME.registerComponent('thumbstick-movement', {
    schema: {
        speed: { type: 'number', default: 3 },
        cameraRig: { type: 'selector', default: '#cameraRig' },
        camera: { type: 'selector', default: '#camera' }
    },

    init: function () {
        this.velocity = new THREE.Vector3();
        this.thumbstickY = 0;

        this.onThumbstickMoved = this.onThumbstickMoved.bind(this);
        this.el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
    },

    onThumbstickMoved: function (evt) {
        this.thumbstickY = evt.detail.y;
    },

    tick: function (time, deltaTime) {
        if (!this.data.cameraRig || !this.data.camera) return;
        if (Math.abs(this.thumbstickY) < 0.1) return;

        const dt = deltaTime / 1000;
        const speed = this.data.speed;
        const camera = this.data.camera.object3D;
        const cameraRig = this.data.cameraRig.object3D;

        // Get forward direction from camera (where user is looking)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        // Move forward/backward based on thumbstick Y
        this.velocity.set(0, 0, 0);
        this.velocity.addScaledVector(forward, -this.thumbstickY * speed * dt);
        cameraRig.position.add(this.velocity);
    },

    remove: function () {
        this.el.removeEventListener('thumbstickmoved', this.onThumbstickMoved);
    }
});


/**
 * Thumbstick Rotation Component (Right Controller)
 * Rotate/turn around vertical axis
 */
AFRAME.registerComponent('thumbstick-rotate', {
    schema: {
        turnSpeed: { type: 'number', default: 1.5 },
        cameraRig: { type: 'selector', default: '#cameraRig' }
    },

    init: function () {
        this.thumbstickX = 0;

        this.onThumbstickMoved = this.onThumbstickMoved.bind(this);
        this.el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
    },

    onThumbstickMoved: function (evt) {
        this.thumbstickX = evt.detail.x;
    },

    tick: function (time, deltaTime) {
        if (!this.data.cameraRig) return;
        if (Math.abs(this.thumbstickX) < 0.1) return;

        const dt = deltaTime / 1000;
        const turnSpeed = this.data.turnSpeed;
        const cameraRig = this.data.cameraRig.object3D;

        // Rotate around Y axis (turn left/right)
        const rotation = -this.thumbstickX * turnSpeed * dt;
        cameraRig.rotation.y += rotation;
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

        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        this.onTriggerDown = this.onTriggerDown.bind(this);

        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onTriggerDown);
    },

    onIntersection: function (evt) {
        const intersectedEls = evt.detail.els;

        for (let i = 0; i < intersectedEls.length; i++) {
            const el = intersectedEls[i];
            if (el.classList.contains('graph-node')) {
                if (this.hoveredNode !== el) {
                    if (this.hoveredNode) {
                        this.hoveredNode.emit('mouseleave');
                    }
                    this.hoveredNode = el;
                    el.emit('mouseenter');
                }
                return;
            }
        }

        if (this.hoveredNode) {
            this.hoveredNode.emit('mouseleave');
            this.hoveredNode = null;
        }
    },

    onIntersectionCleared: function (evt) {
        const clearedEl = evt.detail.clearedEls ? evt.detail.clearedEls[0] : null;
        if (this.hoveredNode && (!clearedEl || clearedEl === this.hoveredNode)) {
            this.hoveredNode.emit('mouseleave');
            this.hoveredNode = null;
        }
    },

    onTriggerDown: function (evt) {
        if (this.hoveredNode) {
            this.hoveredNode.emit('click');
        } else {
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
        const camera = document.querySelector('[wasd-controls]');
        if (camera) {
            camera.setAttribute('wasd-controls', 'enabled', false);
        }
    },

    onExitVR: function () {
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

        const floorGrid = document.createElement('a-entity');
        floorGrid.setAttribute('id', 'floor-grid');
        floorGrid.setAttribute('position', '0 0 0');

        const gridHelper = new THREE.GridHelper(size, divisions, color, color);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        floorGrid.setObject3D('grid', gridHelper);
        this.el.appendChild(floorGrid);

        const wallHeight = 15;
        const wallOpacity = 0.05;
        const halfSize = size / 2;

        this.createWall(0, wallHeight/2, -halfSize, size, wallHeight, 0, color, wallOpacity);
        this.createWall(0, wallHeight/2, halfSize, size, wallHeight, 0, color, wallOpacity);
        this.createWall(-halfSize, wallHeight/2, 0, size, wallHeight, 90, color, wallOpacity);
        this.createWall(halfSize, wallHeight/2, 0, size, wallHeight, 90, color, wallOpacity);

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
