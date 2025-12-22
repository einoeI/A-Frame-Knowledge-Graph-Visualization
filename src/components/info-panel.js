/**
 * Info Panel Component for A-Frame
 * Creates a floating panel that displays character information
 * Follows camera with billboard effect
 */

/* global AFRAME */

AFRAME.registerComponent('info-panel', {
    schema: {
        width: { type: 'number', default: 0.7 },
        height: { type: 'number', default: 0.7 },
        backgroundColor: { type: 'color', default: '#1e1e32' },
        borderColor: { type: 'color', default: '#7A84DD' },
        textColor: { type: 'color', default: '#e0e0e0' },
        labelColor: { type: 'color', default: '#ffffff' },
        titleColor: { type: 'color', default: '#8ACAE5' }
    },

    init: function () {
        this.createPanel();
    },

    createPanel: function () {
        const el = this.el;
        const data = this.data;

        // Background plane
        const bgPlane = document.createElement('a-plane');
        bgPlane.setAttribute('width', data.width);
        bgPlane.setAttribute('height', data.height);
        bgPlane.setAttribute('color', data.backgroundColor);
        bgPlane.setAttribute('opacity', 0.95);
        bgPlane.setAttribute('side', 'double');
        el.appendChild(bgPlane);

        // Border
        const borderPlane = document.createElement('a-plane');
        borderPlane.setAttribute('width', data.width + 0.015);
        borderPlane.setAttribute('height', data.height + 0.015);
        borderPlane.setAttribute('color', data.borderColor);
        borderPlane.setAttribute('position', '0 0 -0.001');
        borderPlane.setAttribute('side', 'double');
        el.appendChild(borderPlane);

        // Layout constants
        const labelScale = '0.22 0.22 0.22';
        const valueScale = '0.22 0.22 0.22';
        const titleScale = '0.38 0.38 0.38';
        const leftX = -data.width/2 + 0.04;
        const valueX = 0.08;
        const rowHeight = 0.055;
        let currentY = data.height/2 - 0.07;

        // Title - Character Name
        const titleText = document.createElement('a-text');
        titleText.setAttribute('id', 'panel-name');
        titleText.setAttribute('value', 'Character');
        titleText.setAttribute('color', data.titleColor);
        titleText.setAttribute('align', 'center');
        titleText.setAttribute('position', `0 ${currentY} 0.01`);
        titleText.setAttribute('scale', titleScale);
        titleText.setAttribute('font', 'roboto');
        el.appendChild(titleText);

        // Divider line
        currentY -= 0.055;
        const divider = document.createElement('a-plane');
        divider.setAttribute('width', data.width - 0.08);
        divider.setAttribute('height', 0.003);
        divider.setAttribute('color', data.borderColor);
        divider.setAttribute('opacity', 0.4);
        divider.setAttribute('position', `0 ${currentY} 0.01`);
        el.appendChild(divider);

        // Race row
        currentY -= rowHeight;
        this.createInfoRow(el, 'Race:', 'panel-race', leftX, valueX, currentY, labelScale, valueScale, data);

        // Gender row
        currentY -= rowHeight;
        this.createInfoRow(el, 'Gender:', 'panel-gender', leftX, valueX, currentY, labelScale, valueScale, data);

        // Appearances row
        currentY -= rowHeight;
        this.createInfoRow(el, 'Appearances:', 'panel-weight', leftX, valueX, currentY, labelScale, valueScale, data);

        // Connections row
        currentY -= rowHeight;
        this.createInfoRow(el, 'Connections:', 'panel-connections', leftX, valueX, currentY, labelScale, valueScale, data);

        // Strongest Connections header
        currentY -= rowHeight + 0.01;
        const strongestLabel = document.createElement('a-text');
        strongestLabel.setAttribute('value', 'Strongest Connections');
        strongestLabel.setAttribute('color', data.titleColor);
        strongestLabel.setAttribute('align', 'left');
        strongestLabel.setAttribute('position', `${leftX} ${currentY} 0.01`);
        strongestLabel.setAttribute('scale', '0.18 0.18 0.18');
        strongestLabel.setAttribute('font', 'roboto');
        el.appendChild(strongestLabel);

        // Top connections list
        currentY -= 0.045;
        const topConnections = document.createElement('a-text');
        topConnections.setAttribute('id', 'panel-top-connections');
        topConnections.setAttribute('value', '-');
        topConnections.setAttribute('color', data.textColor);
        topConnections.setAttribute('align', 'left');
        topConnections.setAttribute('position', `${leftX} ${currentY} 0.01`);
        topConnections.setAttribute('scale', '0.16 0.16 0.16');
        topConnections.setAttribute('font', 'roboto');
        topConnections.setAttribute('baseline', 'top');
        topConnections.setAttribute('wrap-count', 35);
        el.appendChild(topConnections);

        // Initially hidden
        el.setAttribute('visible', false);
    },

    createInfoRow: function (parent, label, valueId, labelX, valueX, y, labelScale, valueScale, data) {
        // Label
        const labelText = document.createElement('a-text');
        labelText.setAttribute('value', label);
        labelText.setAttribute('color', data.labelColor);
        labelText.setAttribute('align', 'left');
        labelText.setAttribute('position', `${labelX} ${y} 0.01`);
        labelText.setAttribute('scale', labelScale);
        labelText.setAttribute('font', 'roboto');
        parent.appendChild(labelText);

        // Value
        const valueText = document.createElement('a-text');
        valueText.setAttribute('id', valueId);
        valueText.setAttribute('value', '-');
        valueText.setAttribute('color', data.textColor);
        valueText.setAttribute('align', 'left');
        valueText.setAttribute('position', `${valueX} ${y} 0.01`);
        valueText.setAttribute('scale', valueScale);
        valueText.setAttribute('font', 'roboto');
        parent.appendChild(valueText);
    }
});
