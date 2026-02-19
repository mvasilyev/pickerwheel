class PickerWheel {
    constructor() {
        this.contestants = [];
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
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

        this.drawWheel();
    }

    updateContestantsList() {
        // In admin mode, the list is rendered externally — this is a no-op.
        // Kept for API compatibility.
    }

    updateButtons() {
        this.spinBtn.disabled = this.contestants.length < 2 || this.isSpinning;
        this.respinBtn.disabled = !this.hasSpun || this.isSpinning || this.contestants.length < 2;

        if (this.contestants.length === 2) {
            this.spinBtn.textContent = 'FLIP COIN';
            this.respinBtn.textContent = 'FLIP AGAIN';
        } else {
            this.spinBtn.textContent = 'SPIN';
            this.respinBtn.textContent = 'RE-SPIN';
        }

        // Show/hide publish button
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

    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 180;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.contestants.length === 0) {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.fill();
            this.ctx.strokeStyle = '#ccc';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.fillStyle = '#666';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No entries yet', centerX, centerY);
            return;
        }

        if (this.contestants.length === 2) {
            this.drawCoin(centerX, centerY, radius);
            return;
        }

        const angleStep = (2 * Math.PI) / this.contestants.length;
        const colors = this.generateColors(this.contestants.length);

        this.contestants.forEach((contestant, index) => {
            const startAngle = index * angleStep + this.rotation;
            const endAngle = (index + 1) * angleStep + this.rotation;

            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = colors[index];
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + angleStep / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            const textRadius = radius * 0.7;
            this.ctx.fillText(contestant, textRadius, 5);
            this.ctx.restore();
        });

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#333';
        this.ctx.fill();
    }

    drawCoin(centerX, centerY, radius) {
        const flipRotation = this.rotation * 0.5;
        const normalizedFlip = Math.abs(flipRotation) % (2 * Math.PI);
        const flipFactor = Math.cos(normalizedFlip);
        const isShowingFront = flipFactor > 0;
        const coinThickness = Math.abs(flipFactor);
        const currentRadius = radius * (0.3 + 0.7 * coinThickness);

        this.ctx.save();
        this.ctx.scale(1, coinThickness);

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY / coinThickness, currentRadius, 0, 2 * Math.PI);

        const gradient = this.ctx.createRadialGradient(
            centerX - 50, centerY / coinThickness - 50, 0,
            centerX, centerY / coinThickness, currentRadius
        );

        if (isShowingFront) {
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.7, '#FFA500');
            gradient.addColorStop(1, '#FF8C00');
        } else {
            gradient.addColorStop(0, '#E5E5E5');
            gradient.addColorStop(0.7, '#C0C0C0');
            gradient.addColorStop(1, '#A0A0A0');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = isShowingFront ? '#B8860B' : '#808080';
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
        this.ctx.restore();

        if (coinThickness > 0.3) {
            this.ctx.fillStyle = isShowingFront ? '#8B4513' : '#2F2F2F';
            this.ctx.textAlign = 'center';

            if (isShowingFront) {
                this.ctx.font = `bold ${24 * coinThickness}px Arial`;
                this.ctx.fillText('HEADS', centerX, centerY - 15);
                this.ctx.font = `bold ${18 * coinThickness}px Arial`;
                this.ctx.fillText(this.contestants[0], centerX, centerY + 15);
            } else {
                this.ctx.font = `bold ${24 * coinThickness}px Arial`;
                this.ctx.fillText('TAILS', centerX, centerY - 15);
                this.ctx.font = `bold ${18 * coinThickness}px Arial`;
                this.ctx.fillText(this.contestants[1], centerX, centerY + 15);
            }
        }

        if (coinThickness < 0.2) {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(centerX - currentRadius, centerY - 3, currentRadius * 2, 6);
        }

        if (coinThickness > 0.4) {
            this.ctx.save();
            this.ctx.scale(1, coinThickness);
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY / coinThickness, currentRadius - 20, 0, 2 * Math.PI);
            this.ctx.strokeStyle = isShowingFront ? '#8B4513' : '#2F2F2F';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        }
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
            colors.push(`hsl(${i * hueStep}, 70%, 60%)`);
        }
        return colors;
    }

    spinWheel() {
        if (this.isSpinning || this.contestants.length < 2) return;
        this.isSpinning = true;
        this.updateButtons();
        this.clearResult();

        const spins = Math.random() * 3 + 3;
        this.animateWheel(spins * 2 * Math.PI);
    }

    respinWheel() {
        if (this.isSpinning || this.contestants.length < 2 || !this.hasSpun) return;
        this.isSpinning = true;
        this.updateButtons();
        this.result.textContent = 'Re-spinning...';
        this.result.className = 'result';

        const spins = Math.random() * 3 + 3;
        this.animateWheel(spins * 2 * Math.PI);
    }

    animateWheel(finalRotation) {
        const startRotation = this.rotation;
        const duration = 2500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);

            this.rotation = startRotation + finalRotation * easeOut;
            this.drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.finishSpin();
            }
        };
        animate();
    }

    finishSpin() {
        this.isSpinning = false;
        this.hasSpun = true;
        this.updateButtons();

        let winner;

        if (this.contestants.length === 2) {
            const flipRotation = this.rotation * 2;
            const normalizedFlip = Math.abs(flipRotation) % (2 * Math.PI);
            const isHeads = Math.cos(normalizedFlip) > 0;
            winner = isHeads ? this.contestants[0] : this.contestants[1];
            const side = isHeads ? 'HEADS' : 'TAILS';
            this.result.textContent = `${side}! Winner: ${winner}`;
        } else {
            const normalizedRotation = this.rotation % (2 * Math.PI);
            const angleStep = (2 * Math.PI) / this.contestants.length;
            const topAngle = (3 * Math.PI / 2 - normalizedRotation) % (2 * Math.PI);
            const adjustedAngle = topAngle < 0 ? topAngle + 2 * Math.PI : topAngle;
            const winnerIndex = Math.floor(adjustedAngle / angleStep) % this.contestants.length;
            winner = this.contestants[winnerIndex];
            this.result.textContent = `Winner: ${winner}`;
        }

        this.result.className = 'result winner';
        this.lastWinner = winner;
        this.updateButtons();
    }
}
