import * as THREE from 'three';

class PickerWheel {
    constructor() {
        this.contestants = [];
        this.canvas = document.getElementById('wheelCanvas');
        this.isSpinning = false;
        this.rotation = 0;
        this.hasSpun = false;
        this.lastWinner = null;
        this.grayscaleMode = new URLSearchParams(window.location.search).has('polish');

        this.spinBtn = document.getElementById('spinBtn');
        this.respinBtn = document.getElementById('respinBtn');
        this.result = document.getElementById('result');
        this.contestantsList = document.getElementById('contestantsList');

        this.spinBtn.addEventListener('click', () => this.spinWheel());
        this.respinBtn.addEventListener('click', () => this.respinWheel());

        // Three.js setup
        this._initScene();
        this._animate();
        this.drawWheel();
    }

    _initScene() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x16213e);

        // Camera — looking down at a slight angle
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(0, 5.5, 4.5);
        this.camera.lookAt(0, 0, 0);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(3, 8, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 20;
        mainLight.shadow.camera.left = -5;
        mainLight.shadow.camera.right = 5;
        mainLight.shadow.camera.top = 5;
        mainLight.shadow.camera.bottom = -5;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-3, 4, -2);
        this.scene.add(fillLight);

        const rimLight = new THREE.PointLight(0xffd700, 0.5, 15);
        rimLight.position.set(0, 2, -4);
        this.scene.add(rimLight);

        // Floor (subtle, for shadow receiving)
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.15;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Texture canvas for wheel face
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = 1024;
        this.textureCanvas.height = 1024;
        this.textureCtx = this.textureCanvas.getContext('2d');

        // Groups
        this.wheelGroup = new THREE.Group();
        this.scene.add(this.wheelGroup);

        this.coinGroup = new THREE.Group();
        this.coinGroup.visible = false;
        this.scene.add(this.coinGroup);

        // 3D Pointer (fixed, not part of wheel group)
        this._createPointer();

        // Env map for metallic reflections
        this._createEnvMap();
    }

    _createEnvMap() {
        // Simple gradient environment map for reflections
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(0.3, '#2a2a5e');
        gradient.addColorStop(0.5, '#4a4a8e');
        gradient.addColorStop(0.7, '#2a2a5e');
        gradient.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        this.envTexture = new THREE.CanvasTexture(canvas);
        this.envTexture.mapping = THREE.EquirectangularReflectionMapping;
    }

    _createPointer() {
        const pointerGroup = new THREE.Group();

        // Main triangle body
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(-0.15, 0.45);
        shape.lineTo(0.15, 0.45);
        shape.closePath();

        const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 };
        const pointerGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const pointerMat = new THREE.MeshStandardMaterial({
            color: 0xff2233,
            metalness: 0.6,
            roughness: 0.2,
            envMap: this.envTexture,
        });
        const pointerMesh = new THREE.Mesh(pointerGeo, pointerMat);
        pointerMesh.castShadow = true;

        pointerGroup.add(pointerMesh);
        pointerGroup.position.set(0, 0.25, -2.35);
        pointerGroup.rotation.x = -Math.PI / 2;

        this.scene.add(pointerGroup);
    }

    _buildWheel() {
        // Clear previous wheel meshes
        while (this.wheelGroup.children.length) {
            const child = this.wheelGroup.children[0];
            this.wheelGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }

        if (this.contestants.length === 0) {
            this._buildEmptyWheel();
            return;
        }

        // Draw segments on texture canvas
        this._drawWheelTexture();

        const texture = new THREE.CanvasTexture(this.textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        // Main disc
        const discGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64);
        const discMaterials = [
            // Side (rim)
            new THREE.MeshStandardMaterial({
                color: 0xdaa520,
                metalness: 0.9,
                roughness: 0.1,
                envMap: this.envTexture,
            }),
            // Top face
            new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.1,
                roughness: 0.4,
            }),
            // Bottom face
            new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                metalness: 0.5,
                roughness: 0.5,
            }),
        ];
        const disc = new THREE.Mesh(discGeo, discMaterials);
        disc.castShadow = true;
        disc.receiveShadow = true;
        this.wheelGroup.add(disc);

        // Outer metallic ring
        const ringGeo = new THREE.TorusGeometry(2.28, 0.06, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.05,
            envMap: this.envTexture,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.09;
        ring.castShadow = true;
        this.wheelGroup.add(ring);

        // Bottom ring
        const ringBottom = ring.clone();
        ringBottom.position.y = -0.09;
        this.wheelGroup.add(ringBottom);

        // Center hub — matte dark metal
        const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.22, 32);
        const hubMat = new THREE.MeshStandardMaterial({
            color: 0x2A2A2A,
            metalness: 0.3,
            roughness: 0.7,
        });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.castShadow = true;
        this.wheelGroup.add(hub);

        // Divider pegs on the rim
        const pegCount = this.contestants.length;
        const pegGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
        const pegMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.1,
            envMap: this.envTexture,
        });
        for (let i = 0; i < pegCount; i++) {
            // Align pegs with texture dividers: canvas angle = -geomAngle,
            // divider i is at canvas angle (i*step - PI/2), so geomAngle = PI/2 - i*step
            const geomAngle = Math.PI / 2 - (i * 2 * Math.PI) / pegCount;
            const peg = new THREE.Mesh(pegGeo, pegMat);
            peg.position.set(
                Math.sin(geomAngle) * 2.05,
                0.15,
                Math.cos(geomAngle) * 2.05
            );
            peg.castShadow = true;
            this.wheelGroup.add(peg);
        }

        this.wheelGroup.rotation.y = this.rotation;
    }

    _buildEmptyWheel() {
        const discGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64);
        const discMat = new THREE.MeshStandardMaterial({
            color: 0x444466,
            metalness: 0.3,
            roughness: 0.6,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.castShadow = true;
        this.wheelGroup.add(disc);

        // Ring
        const ringGeo = new THREE.TorusGeometry(2.28, 0.06, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.2,
            envMap: this.envTexture,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.09;
        this.wheelGroup.add(ring);
    }

    _drawFeltTexture(ctx, size) {
        // Rich dark green felt base — like a real casino table
        ctx.fillStyle = '#1A4D2E';
        ctx.fillRect(0, 0, size, size);

        // Coarse woven fibers — visible weave pattern
        const step = 3;
        for (let i = 0; i < size; i += step) {
            const base = 30 + Math.floor(Math.random() * 15);
            // Horizontal fibers
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = `rgb(${base - 8}, ${base + 25}, ${base + 5})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, i);
            for (let x = 0; x < size; x += 6) {
                ctx.lineTo(x, i + (Math.random() - 0.5) * 2);
            }
            ctx.stroke();
            // Vertical fibers — slightly different tone
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = `rgb(${base - 10}, ${base + 18}, ${base})`;
            ctx.beginPath();
            ctx.moveTo(i, 0);
            for (let y = 0; y < size; y += 6) {
                ctx.lineTo(i + (Math.random() - 0.5) * 2, y);
            }
            ctx.stroke();
        }

        // Scattered lint / grain particles
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 2 + 0.5;
            const g = 40 + Math.floor(Math.random() * 30);
            ctx.fillStyle = `rgb(${g - 10}, ${g + 15}, ${g - 5})`;
            ctx.fillRect(x, y, r, r);
        }

        // Subtle lighter patches — worn felt look
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 80 + Math.random() * 150;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, '#2E6B45');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        ctx.globalAlpha = 1;
    }

    _drawWheelTexture() {
        const ctx = this.textureCtx;
        const size = this.textureCanvas.width;
        const center = size / 2;
        const radius = size / 2;

        ctx.clearRect(0, 0, size, size);

        // Felt background for the whole texture
        this._drawFeltTexture(ctx, size);

        const count = this.contestants.length;
        const angleStep = (2 * Math.PI) / count;

        // Clip to circle for felt, then draw segments on top
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        // Re-draw felt inside circle (already drawn, clip just masks it)
        ctx.restore();

        // Draw segment dividers — bright gold lines
        ctx.save();
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(
                center + Math.cos(angle) * (radius - 2),
                center + Math.sin(angle) * (radius - 2)
            );
            ctx.strokeStyle = '#D4A843';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();

        // Subtle radial gradient overlay per segment for depth
        for (let i = 0; i < count; i++) {
            const startAngle = i * angleStep - Math.PI / 2;
            const endAngle = (i + 1) * angleStep - Math.PI / 2;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius - 2, startAngle, endAngle);
            ctx.closePath();
            ctx.clip();

            // Very subtle radial highlight from center
            const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
            grad.addColorStop(0, 'rgba(212,168,67,0.06)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.15)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        }

        // Draw text on each segment
        for (let i = 0; i < count; i++) {
            const midAngle = i * angleStep + angleStep / 2 - Math.PI / 2;

            // Flip text on the left half so it's always readable
            const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const onLeftHalf = normalizedAngle > Math.PI / 2 && normalizedAngle < 3 * Math.PI / 2;

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(midAngle);

            if (onLeftHalf) {
                // Flip: move to the opposite side and rotate 180°
                ctx.rotate(Math.PI);
            }

            // Gold text with dark shadow
            ctx.fillStyle = '#F4D675';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const text = this.contestants[i];
            const fontSize = Math.min(40, Math.max(18, Math.floor(300 / count)));
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;

            const textX = onLeftHalf ? -radius * 0.6 : radius * 0.6;

            // Truncate text if too long
            let displayText = text;
            const maxWidth = radius * 0.55;
            if (ctx.measureText(displayText).width > maxWidth) {
                while (ctx.measureText(displayText + '…').width > maxWidth && displayText.length > 0) {
                    displayText = displayText.slice(0, -1);
                }
                displayText += '…';
            }

            ctx.strokeText(displayText, textX, 0);
            ctx.fillText(displayText, textX, 0);
            ctx.restore();
        }

        // Center circle — dark with gold ring
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.1, 0, 2 * Math.PI);
        ctx.fillStyle = '#0A0A0F';
        ctx.fill();
        ctx.strokeStyle = '#D4A843';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // --- Coin ---

    _buildCoin() {
        while (this.coinGroup.children.length) {
            const child = this.coinGroup.children[0];
            this.coinGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }

        if (this.contestants.length !== 2) return;

        const coinRadius = 1.8;
        const coinThickness = 0.15;

        // Create textures for heads and tails
        const headsTexture = this._createCoinFaceTexture(
            'ОРЁЛ', this.contestants[0], '#FFD700', '#B8860B', '#8B4513'
        );
        const tailsTexture = this._createCoinFaceTexture(
            'РЕШКА', this.contestants[1], '#E8E8E8', '#A0A0A0', '#2F2F2F'
        );

        // Coin body
        const coinGeo = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 64);
        const coinMaterials = [
            // Edge
            new THREE.MeshStandardMaterial({
                color: 0xDAA520,
                metalness: 0.95,
                roughness: 0.05,
                envMap: this.envTexture,
            }),
            // Top (heads)
            new THREE.MeshStandardMaterial({
                map: headsTexture,
                metalness: 0.6,
                roughness: 0.25,
                envMap: this.envTexture,
                envMapIntensity: 0.3,
            }),
            // Bottom (tails)
            new THREE.MeshStandardMaterial({
                map: tailsTexture,
                metalness: 0.5,
                roughness: 0.3,
                envMap: this.envTexture,
                envMapIntensity: 0.3,
            }),
        ];
        const coin = new THREE.Mesh(coinGeo, coinMaterials);
        coin.castShadow = true;
        coin.receiveShadow = true;
        this.coinGroup.add(coin);

        // Edge ridges
        const ridgeCount = 120;
        const ridgeGeo = new THREE.BoxGeometry(0.015, coinThickness * 1.02, 0.04);
        const ridgeMat = new THREE.MeshStandardMaterial({
            color: 0xC8A82A,
            metalness: 0.9,
            roughness: 0.1,
        });
        for (let i = 0; i < ridgeCount; i++) {
            const angle = (i / ridgeCount) * Math.PI * 2;
            const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
            ridge.position.set(
                Math.cos(angle) * (coinRadius + 0.005),
                0,
                Math.sin(angle) * (coinRadius + 0.005)
            );
            ridge.rotation.y = -angle;
            this.coinGroup.add(ridge);
        }

        // Outer ring
        const ringGeo = new THREE.TorusGeometry(coinRadius + 0.02, 0.03, 12, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.95,
            roughness: 0.05,
            envMap: this.envTexture,
        });
        const topRing = new THREE.Mesh(ringGeo, ringMat);
        topRing.rotation.x = Math.PI / 2;
        topRing.position.y = coinThickness / 2;
        this.coinGroup.add(topRing);

        const bottomRing = topRing.clone();
        bottomRing.position.y = -coinThickness / 2;
        this.coinGroup.add(bottomRing);
    }

    _createCoinFaceTexture(title, name, bgColor, borderColor, textColor) {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2;

        // Background gradient
        const gradient = ctx.createRadialGradient(
            center - 100, center - 100, 0,
            center, center, radius
        );
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(0.7, borderColor);
        gradient.addColorStop(1, borderColor);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner decorative ring
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Decorative dots around the ring
        const dotCount = 36;
        for (let i = 0; i < dotCount; i++) {
            const angle = (i / dotCount) * Math.PI * 2;
            const x = center + Math.cos(angle) * radius * 0.88;
            const y = center + Math.sin(angle) * radius * 0.88;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Star/emblem in center
        this._drawStar(ctx, center, center - 30, 60, 30, 5, textColor);

        // Title text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 80px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, center, center + 50);

        // Name text
        ctx.font = 'bold 50px Arial, sans-serif';
        ctx.globalAlpha = 0.8;
        let displayName = name;
        if (ctx.measureText(displayName).width > radius * 1.4) {
            while (ctx.measureText(displayName + '…').width > radius * 1.4 && displayName.length > 0) {
                displayName = displayName.slice(0, -1);
            }
            displayName += '…';
        }
        ctx.fillText(displayName, center, center + 120);
        ctx.globalAlpha = 1;

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    _drawStar(ctx, cx, cy, outerR, innerR, points, color) {
        ctx.beginPath();
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // --- Rendering ---

    _animate() {
        requestAnimationFrame(() => this._animate());
        this.renderer.render(this.scene, this.camera);
    }

    drawWheel() {
        if (this.contestants.length === 2) {
            this.wheelGroup.visible = false;
            this.coinGroup.visible = true;
            this._buildCoin();
        } else {
            this.wheelGroup.visible = true;
            this.coinGroup.visible = false;
            this._buildWheel();
        }
    }

    // --- Public API (unchanged) ---

    updateContestantsList() {
        // In admin mode, the list is rendered externally — this is a no-op.
    }

    updateButtons() {
        this.spinBtn.disabled = this.contestants.length < 2 || this.isSpinning;
        this.respinBtn.disabled = !this.hasSpun || this.isSpinning || this.contestants.length < 2;

        if (this.contestants.length === 2) {
            this.spinBtn.textContent = 'МОНЕТКА';
            this.respinBtn.textContent = 'ЕЩЁ РАЗ';
        } else {
            this.spinBtn.textContent = 'КРУТИТЬ';
            this.respinBtn.textContent = 'ЕЩЁ РАЗ';
        }

        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.style.display = this.lastWinner ? '' : 'none';
        }
    }

    clearResult() {
        this.result.textContent = '';
        this.result.className = 'result';
        this.hasSpun = false;
        this.updateButtons();
    }

    generateColors(count) {
        if (this.grayscaleMode) {
            const grays = [];
            const minL = 30, maxL = 60;
            const step = count > 1 ? (maxL - minL) / (count - 1) : 0;
            for (let i = 0; i < count; i++) {
                grays.push(`hsl(0, 0%, ${Math.round(minL + i * step)}%)`);
            }
            return grays;
        }
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${i * hueStep}, 70%, 55%)`);
        }
        return colors;
    }

    spinWheel() {
        if (this.isSpinning || this.contestants.length < 2) return;
        this.isSpinning = true;
        this.updateButtons();
        this.clearResult();

        if (this.contestants.length === 2) {
            this._startCoinFlip();
        } else {
            this._startWheelSpin();
        }
    }

    respinWheel() {
        if (this.isSpinning || this.contestants.length < 2 || !this.hasSpun) return;
        this.isSpinning = true;
        this.updateButtons();
        this.result.textContent = 'Крутим ещё раз...';
        this.result.className = 'result';

        if (this.contestants.length === 2) {
            this._startCoinFlip();
        } else {
            this._startWheelSpin();
        }
    }

    // --- Wheel Spin Animation ---

    _startWheelSpin() {
        const count = this.contestants.length;
        const angleStep = (2 * Math.PI) / count;

        // Pick winner first, then calculate exact landing rotation
        this._pendingWinner = Math.floor(Math.random() * count);

        // Geometry angle for the center of the winning segment
        const segCenter = this._pendingWinner * angleStep + angleStep / 2;
        // Add jitter so it doesn't always land dead-center
        const jitter = (Math.random() - 0.5) * angleStep * 0.7;

        // Canvas LEFT maps to the pointer (-Z).  Canvas angle = -geometryAngle.
        // Segment i at canvas angle (i*step - PI/2). Pointer canvas angle = -(PI - R) = R - PI.
        // To place segment center at pointer: segCenter - PI/2 = R - PI → R = segCenter + PI/2
        const targetR = ((segCenter + jitter + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

        // Calculate delta from current rotation
        let delta = targetR - (this.rotation % (2 * Math.PI));
        if (delta < 0) delta += 2 * Math.PI;
        // Add 3-6 full spins for visual drama
        delta += (Math.floor(Math.random() * 3) + 3) * 2 * Math.PI;

        this._animateWheelSpin(delta);
    }

    _animateWheelSpin(totalRotation) {
        const startRotation = this.rotation;
        const duration = 4000;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Quartic ease-out for dramatic deceleration
            const easeOut = 1 - Math.pow(1 - progress, 4);

            this.rotation = startRotation + totalRotation * easeOut;
            this.wheelGroup.rotation.y = this.rotation;

            // Subtle wobble during spin
            const speed = (1 - progress) * totalRotation / duration * 1000;
            this.wheelGroup.rotation.x = Math.sin(now * 0.003) * Math.min(speed * 0.0003, 0.05);
            this.wheelGroup.rotation.z = Math.cos(now * 0.002) * Math.min(speed * 0.0002, 0.03);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                this.wheelGroup.rotation.x = 0;
                this.wheelGroup.rotation.z = 0;
                this._finishWheelSpin();
            }
        };
        requestAnimationFrame(tick);
    }

    _finishWheelSpin() {
        this.isSpinning = false;
        this.hasSpun = true;
        this.updateButtons();

        const winner = this.contestants[this._pendingWinner];
        this.result.textContent = `Победитель: ${winner}`;
        this.result.className = 'result winner';
        this.lastWinner = winner;
        this.updateButtons();
    }

    // --- Coin Flip Animation ---

    _startCoinFlip() {
        // Pick winner first
        this._pendingCoinIsHeads = Math.random() < 0.5;
        // Heads: land with top face up (rotation.x ≡ 0 mod 2PI)
        // Tails: land with top face down (rotation.x ≡ PI mod 2PI)
        const targetAngle = this._pendingCoinIsHeads ? 0 : Math.PI;
        const startRotX = this.coinGroup.rotation.x;

        let delta = targetAngle - (startRotX % (2 * Math.PI));
        if (delta < 0) delta += 2 * Math.PI;
        // 6-12 half-flips for drama
        delta += (Math.floor(Math.random() * 3) + 3) * 2 * Math.PI;

        this._animateCoinFlip(delta);
    }

    _animateCoinFlip(totalRotation) {
        const duration = 3000;
        const startTime = performance.now();
        const startRotX = this.coinGroup.rotation.x;
        const arcHeight = 2.5;

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease: fast start, slow end
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // Flip rotation
            this.coinGroup.rotation.x = startRotX + totalRotation * easeOut;

            // Arc trajectory (parabola)
            const arcProgress = progress * 2 - 1; // -1 to 1
            this.coinGroup.position.y = arcHeight * (1 - arcProgress * arcProgress) * (1 - progress * 0.5);

            // Slight wobble on other axes
            const wobble = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.15;
            this.coinGroup.rotation.y = wobble;
            this.coinGroup.rotation.z = wobble * 0.5;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                this.coinGroup.position.y = 0;
                this.coinGroup.rotation.y = 0;
                this.coinGroup.rotation.z = 0;
                this._finishCoinFlip();
            }
        };
        requestAnimationFrame(tick);
    }

    _finishCoinFlip() {
        this.isSpinning = false;
        this.hasSpun = true;
        this.updateButtons();

        const isHeads = this._pendingCoinIsHeads;
        const winner = isHeads ? this.contestants[0] : this.contestants[1];
        const side = isHeads ? 'ОРЁЛ' : 'РЕШКА';

        this.result.textContent = `${side}! Победитель: ${winner}`;
        this.result.className = 'result winner';
        this.lastWinner = winner;
        this.updateButtons();
    }
}

window.PickerWheel = PickerWheel;
