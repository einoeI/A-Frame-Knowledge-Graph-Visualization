/**
 * VR Controls Component for A-Frame
 * Provides enhanced VR interaction: gaze cursor, teleportation, comfort options
 */

/* global AFRAME, THREE */

/**
 * Gaze Cursor Component
 * Provides hands-free interaction via gaze with dwell time
 */
AFRAME.registerComponent('gaze-cursor', {
    schema: {
        fuseTimeout: { type: 'number', default: 1500 },  // Time to trigger click (ms)
        cursorColor: { type: 'color', default: '#8ACAE5' },
        cursorColorHover: { type: 'color', default: '#046de7' },
        cursorScale: { type: 'number', default: 0.02 },
        distance: { type: 'number', default: 2 }
    },

    init: function () {
        this.isHovering = false;
        this.hoverStartTime = 0;
        this.hoverTarget = null;
        this.fuseProgress = 0;
        this.isVRMode = false;  // Only active in VR mode

        // Create cursor geometry
        this.createCursor();

        // Bind handlers
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);

        // Listen for raycaster events
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        // Listen for VR mode changes
        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.addEventListener('exit-vr', this.onExitVR);
    },

    onEnterVR: function () {
        this.isVRMode = true;
        this.el.setAttribute('visible', true);
    },

    onExitVR: function () {
        this.isVRMode = false;
        this.el.setAttribute('visible', false);
        // Reset any ongoing hover
        if (this.hoverTarget) {
            this.onIntersectionCleared();
        }
    },

    createCursor: function () {
        // Outer ring (progress indicator)
        this.progressRing = document.createElement('a-ring');
        this.progressRing.setAttribute('radius-inner', this.data.cursorScale * 0.6);
        this.progressRing.setAttribute('radius-outer', this.data.cursorScale);
        this.progressRing.setAttribute('color', this.data.cursorColor);
        this.progressRing.setAttribute('opacity', 0.8);
        this.progressRing.setAttribute('theta-length', 0);
        this.progressRing.setAttribute('position', `0 0 -${this.data.distance}`);
        this.progressRing.setAttribute('material', 'shader: flat; side: double');
        this.el.appendChild(this.progressRing);

        // Center dot
        this.centerDot = document.createElement('a-circle');
        this.centerDot.setAttribute('radius', this.data.cursorScale * 0.3);
        this.centerDot.setAttribute('color', this.data.cursorColor);
        this.centerDot.setAttribute('position', `0 0 -${this.data.distance}`);
        this.centerDot.setAttribute('material', 'shader: flat; side: double');
        this.el.appendChild(this.centerDot);
    },

    onIntersection: function (evt) {
        // Only process in VR mode
        if (!this.isVRMode) return;

        const intersectedEl = evt.detail.els[0];
        if (!intersectedEl || !intersectedEl.classList.contains('graph-node')) return;

        if (this.hoverTarget !== intersectedEl) {
            this.hoverTarget = intersectedEl;
            this.hoverStartTime = Date.now();
            this.isHovering = true;

            // Change cursor color
            this.centerDot.setAttribute('color', this.data.cursorColorHover);
            this.progressRing.setAttribute('color', this.data.cursorColorHover);

            // Emit hover event
            intersectedEl.emit('mouseenter');
        }
    },

    onIntersectionCleared: function (evt) {
        if (this.hoverTarget) {
            this.hoverTarget.emit('mouseleave');
        }

        this.isHovering = false;
        this.hoverTarget = null;
        this.fuseProgress = 0;

        // Reset cursor
        this.centerDot.setAttribute('color', this.data.cursorColor);
        this.progressRing.setAttribute('color', this.data.cursorColor);
        this.progressRing.setAttribute('theta-length', 0);
    },

    tick: function () {
        // Only process in VR mode
        if (!this.isVRMode || !this.isHovering || !this.hoverTarget) return;

        const elapsed = Date.now() - this.hoverStartTime;
        this.fuseProgress = Math.min(elapsed / this.data.fuseTimeout, 1);

        // Update progress ring
        this.progressRing.setAttribute('theta-length', this.fuseProgress * 360);

        // Trigger click when fuse completes
        if (this.fuseProgress >= 1) {
            this.hoverTarget.emit('click');

            // Reset fuse
            this.hoverStartTime = Date.now();
            this.fuseProgress = 0;
            this.progressRing.setAttribute('theta-length', 0);

            // Visual feedback - pulse
            this.centerDot.setAttribute('scale', '1.5 1.5 1.5');
            setTimeout(() => {
                this.centerDot.setAttribute('scale', '1 1 1');
            }, 200);
        }
    },

    remove: function () {
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR);
    }
});


/**
 * Simple Teleport Component
 * Click on floor/ground to teleport
 */
AFRAME.registerComponent('teleport-controls', {
    schema: {
        cameraRig: { type: 'selector', default: '#cameraRig' },
        button: { type: 'string', default: 'trigger' },
        enabled: { type: 'boolean', default: true }
    },

    init: function () {
        this.isAiming = false;
        this.targetPosition = new THREE.Vector3();

        // Create teleport marker
        this.createMarker();

        // Bind handlers
        this.onButtonDown = this.onButtonDown.bind(this);
        this.onButtonUp = this.onButtonUp.bind(this);

        // Listen for controller events
        this.el.addEventListener('triggerdown', this.onButtonDown);
        this.el.addEventListener('triggerup', this.onButtonUp);
        this.el.addEventListener('gripdown', this.onButtonDown);
        this.el.addEventListener('gripup', this.onButtonUp);
    },

    createMarker: function () {
        this.marker = document.createElement('a-entity');

        // Ring on ground
        const ring = document.createElement('a-ring');
        ring.setAttribute('radius-inner', 0.4);
        ring.setAttribute('radius-outer', 0.5);
        ring.setAttribute('color', '#8ACAE5');
        ring.setAttribute('rotation', '-90 0 0');
        ring.setAttribute('material', 'shader: flat; opacity: 0.8');
        this.marker.appendChild(ring);

        // Center circle
        const center = document.createElement('a-circle');
        center.setAttribute('radius', 0.3);
        center.setAttribute('color', '#8ACAE5');
        center.setAttribute('rotation', '-90 0 0');
        center.setAttribute('material', 'shader: flat; opacity: 0.5');
        this.marker.appendChild(center);

        this.marker.setAttribute('visible', false);
        this.el.sceneEl.appendChild(this.marker);
    },

    onButtonDown: function (evt) {
        if (!this.data.enabled) return;
        this.isAiming = true;
    },

    onButtonUp: function (evt) {
        if (!this.data.enabled || !this.isAiming) return;
        this.isAiming = false;
        this.marker.setAttribute('visible', false);

        // Perform teleport
        if (this.data.cameraRig && this.targetPosition) {
            const rig = this.data.cameraRig;
            rig.setAttribute('position', {
                x: this.targetPosition.x,
                y: rig.getAttribute('position').y,  // Keep same height
                z: this.targetPosition.z
            });
        }
    },

    tick: function () {
        if (!this.isAiming) return;

        // Raycast to find teleport position
        const raycaster = this.el.components.raycaster;
        if (!raycaster) return;

        const intersections = raycaster.intersections;
        if (intersections.length > 0) {
            // Find a valid teleport surface (floor, ground, or open space)
            for (let i = 0; i < intersections.length; i++) {
                const intersection = intersections[i];

                // Use the intersection point
                this.targetPosition.copy(intersection.point);
                this.marker.setAttribute('position', this.targetPosition);
                this.marker.setAttribute('visible', true);
                break;
            }
        }
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onButtonDown);
        this.el.removeEventListener('triggerup', this.onButtonUp);
        if (this.marker && this.marker.parentNode) {
            this.marker.parentNode.removeChild(this.marker);
        }
    }
});


/**
 * VR Mode Handler
 * Adjusts controls and UI based on VR vs desktop mode
 */
AFRAME.registerComponent('vr-mode-handler', {
    init: function () {
        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);

        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.addEventListener('exit-vr', this.onExitVR);
    },

    onEnterVR: function () {
        console.log('[VRModeHandler] Entered VR mode');

        // Enable gaze cursor if no controllers detected
        const gazeCursor = document.querySelector('[gaze-cursor]');
        if (gazeCursor) {
            gazeCursor.setAttribute('gaze-cursor', 'fuseTimeout', 1500);
        }

        // Disable WASD in VR (use controllers instead)
        const camera = document.querySelector('[wasd-controls]');
        if (camera) {
            camera.setAttribute('wasd-controls', 'enabled', false);
        }

        // Scale up info panel for VR readability
        const infoPanel = document.querySelector('#info-panel');
        if (infoPanel) {
            infoPanel.setAttribute('scale', '1.5 1.5 1.5');
        }
    },

    onExitVR: function () {
        console.log('[VRModeHandler] Exited VR mode');

        // Re-enable WASD for desktop
        const camera = document.querySelector('[wasd-controls]');
        if (camera) {
            camera.setAttribute('wasd-controls', 'enabled', true);
        }

        // Reset info panel scale
        const infoPanel = document.querySelector('#info-panel');
        if (infoPanel) {
            infoPanel.setAttribute('scale', '1 1 1');
        }
    },

    remove: function () {
        this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR);
    }
});


/**
 * Comfort Vignette Component
 * Reduces motion sickness by adding vignette during movement
 */
AFRAME.registerComponent('comfort-vignette', {
    schema: {
        enabled: { type: 'boolean', default: true },
        intensity: { type: 'number', default: 0.5 }
    },

    init: function () {
        if (!this.data.enabled) return;

        // Create vignette overlay
        this.vignette = document.createElement('a-entity');
        this.vignette.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: 0.3,
            radiusOuter: 0.6
        });
        this.vignette.setAttribute('material', {
            color: 'black',
            shader: 'flat',
            opacity: 0,
            transparent: true,
            side: 'double'
        });
        this.vignette.setAttribute('position', '0 0 -0.5');
        this.el.appendChild(this.vignette);

        this.lastPosition = new THREE.Vector3();
        this.isMoving = false;
    },

    tick: function () {
        if (!this.data.enabled || !this.vignette) return;

        const position = this.el.object3D.position;
        const moved = position.distanceTo(this.lastPosition) > 0.01;

        if (moved && !this.isMoving) {
            // Started moving - fade in vignette
            this.isMoving = true;
            this.vignette.setAttribute('material', 'opacity', this.data.intensity);
        } else if (!moved && this.isMoving) {
            // Stopped moving - fade out vignette
            this.isMoving = false;
            this.vignette.setAttribute('material', 'opacity', 0);
        }

        this.lastPosition.copy(position);
    }
});

console.log('[VRControls] Components registered: gaze-cursor, teleport-controls, vr-mode-handler, comfort-vignette');
