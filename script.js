class PickerWheel {
    constructor() {
        this.contestants = [];
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isSpinning = false;
        this.rotation = 0;
        this.hasSpun = false;
        this.lastWinner = null;
    // Easter egg: grayscale mode when URL has ?polish
    this.grayscaleMode = new URLSearchParams(window.location.search).has('polish');
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadContestants();
        this.drawWheel();
    }
    
    initializeElements() {
        this.contestantInput = document.getElementById('contestantInput');
        this.addBtn = document.getElementById('addBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.spinBtn = document.getElementById('spinBtn');
        this.respinBtn = document.getElementById('respinBtn');
        this.contestantsList = document.getElementById('contestantsList');
        this.result = document.getElementById('result');
    }
    
    setupEventListeners() {
        this.addBtn.addEventListener('click', () => this.addContestant());
        this.clearBtn.addEventListener('click', () => this.clearContestants());
        this.spinBtn.addEventListener('click', () => this.spinWheel());
        this.respinBtn.addEventListener('click', () => this.respinWheel());
        
        this.contestantInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addContestant();
            }
        });
    }
    
    addContestant() {
        const name = this.contestantInput.value.trim();
        if (name && !this.contestants.includes(name)) {
            this.contestants.push(name);
            this.contestantInput.value = '';
            this.updateContestantsList();
            this.drawWheel();
            this.updateButtons();
            this.clearResult();
            this.saveContestants();
        }
    }
    
    removeContestant(index) {
        this.contestants.splice(index, 1);
        this.updateContestantsList();
        this.drawWheel();
        this.updateButtons();
        this.clearResult();
        this.saveContestants();
    }
    
    clearContestants() {
        this.contestants = [];
        this.updateContestantsList();
        this.drawWheel();
        this.updateButtons();
        this.clearResult();
        this.hasSpun = false;
        this.saveContestants();
    }
    
    updateContestantsList() {
        this.contestantsList.innerHTML = '';
        this.contestants.forEach((contestant, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${contestant}</span>
                <button class="remove-btn" onclick="wheel.removeContestant(${index})">Remove</button>
            `;
            this.contestantsList.appendChild(li);
        });
    }
    
    updateButtons() {
        this.spinBtn.disabled = this.contestants.length < 2 || this.isSpinning;
        this.respinBtn.disabled = !this.hasSpun || this.isSpinning || this.contestants.length < 2;
        
        // Update button text based on number of contestants
        if (this.contestants.length === 2) {
            this.spinBtn.textContent = 'FLIP COIN';
            this.respinBtn.textContent = 'FLIP AGAIN';
        } else {
            this.spinBtn.textContent = 'SPIN';
            this.respinBtn.textContent = 'RE-SPIN';
        }
    }
    
    clearResult() {
        this.result.textContent = '';
        this.result.className = 'result';
        this.hasSpun = false;
        this.updateButtons();
    }
    
    // Local Storage methods
    saveContestants() {
        localStorage.setItem('pickerWheel_contestants', JSON.stringify(this.contestants));
    }
    
    loadContestants() {
        const saved = localStorage.getItem('pickerWheel_contestants');
        if (saved) {
            try {
                this.contestants = JSON.parse(saved);
                this.updateContestantsList();
                this.updateButtons();
            } catch (e) {
                console.warn('Failed to load contestants from localStorage:', e);
                this.contestants = [];
            }
        }
    }
    
    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 180;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.contestants.length === 0) {
            // Draw empty wheel
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.fill();
            this.ctx.strokeStyle = '#ccc';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Add text
            this.ctx.fillStyle = '#666';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Add contestants to start', centerX, centerY);
            return;
        }
        
        // Special case for 2 contestants - draw a coin
        if (this.contestants.length === 2) {
            this.drawCoin(centerX, centerY, radius);
            return;
        }
        
        const angleStep = (2 * Math.PI) / this.contestants.length;
        const colors = this.generateColors(this.contestants.length);
        
        // Draw wheel segments
        this.contestants.forEach((contestant, index) => {
            const startAngle = index * angleStep + this.rotation;
            const endAngle = (index + 1) * angleStep + this.rotation;
            
            // Draw segment
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = colors[index];
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw text
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + angleStep / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            
            // Calculate text position
            const textRadius = radius * 0.7;
            this.ctx.fillText(contestant, textRadius, 5);
            this.ctx.restore();
        });
        
        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#333';
        this.ctx.fill();
    }
    
    drawCoin(centerX, centerY, radius) {
        // Calculate flip rotation based on wheel rotation
        const flipRotation = this.rotation * .5; // Slower, more realistic flips
        const normalizedFlip = Math.abs(flipRotation) % (2 * Math.PI);
        
        // Calculate 3D flip effect - cos gives us the "thickness" of the coin
        const flipFactor = Math.cos(normalizedFlip);
        const isShowingFront = flipFactor > 0;
        const coinThickness = Math.abs(flipFactor);
        
        // Adjust radius based on flip perspective
        const currentRadius = radius * (0.3 + 0.7 * coinThickness);
        
        // Draw coin base with perspective
        this.ctx.save();
        this.ctx.scale(1, coinThickness);
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY / coinThickness, currentRadius, 0, 2 * Math.PI);
        
        // Create gradient for coin effect
        const gradient = this.ctx.createRadialGradient(
            centerX - 50, centerY / coinThickness - 50, 0, 
            centerX, centerY / coinThickness, currentRadius
        );
        
        if (isShowingFront) {
            // Gold side (HEADS)
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.7, '#FFA500');
            gradient.addColorStop(1, '#FF8C00');
        } else {
            // Silver side (TAILS)
            gradient.addColorStop(0, '#E5E5E5');
            gradient.addColorStop(0.7, '#C0C0C0');
            gradient.addColorStop(1, '#A0A0A0');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw border
        this.ctx.strokeStyle = isShowingFront ? '#B8860B' : '#808080';
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
        
        this.ctx.restore();
        
        // Only draw text when coin is relatively flat (not mid-flip)
        if (coinThickness > 0.3) {
            this.ctx.fillStyle = isShowingFront ? '#8B4513' : '#2F2F2F';
            this.ctx.textAlign = 'center';
            
            if (isShowingFront) {
                // HEADS side
                this.ctx.font = `bold ${24 * coinThickness}px Arial`;
                this.ctx.fillText('HEADS', centerX, centerY - 15);
                
                this.ctx.font = `bold ${18 * coinThickness}px Arial`;
                this.ctx.fillText(this.contestants[0], centerX, centerY + 15);
            } else {
                // TAILS side
                this.ctx.font = `bold ${24 * coinThickness}px Arial`;
                this.ctx.fillText('TAILS', centerX, centerY - 15);
                
                this.ctx.font = `bold ${18 * coinThickness}px Arial`;
                this.ctx.fillText(this.contestants[1], centerX, centerY + 15);
            }
        }
        
        // Add edge effect when coin is very thin (mid-flip)
        if (coinThickness < 0.2) {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(centerX - currentRadius, centerY - 3, currentRadius * 2, 6);
        }
        
        // Add decorative border when coin is visible enough
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
        // If grayscale easter egg is active, return grayscale colors
        if (this.grayscaleMode) {
            const grays = [];
            // Distribute lightness between 30% and 60% for good contrast with white text
            const minL = 30;
            const maxL = 60;
            const step = count > 1 ? (maxL - minL) / (count - 1) : 0;
            for (let i = 0; i < count; i++) {
                const lightness = Math.round(minL + i * step);
                grays.push(`hsl(0, 0%, ${lightness}%)`);
            }
            return grays;
        }

        // Default: rainbow hues around the wheel
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            const hue = i * hueStep;
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
        return colors;
    }
    
    spinWheel() {
        if (this.isSpinning || this.contestants.length < 2) return;
        
        this.isSpinning = true;
        this.updateButtons();
        this.clearResult();
        
        // Random spin amount (fewer rotations for shorter animation)
        const minSpins = 3;
        const maxSpins = 6;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        const finalRotation = spins * 2 * Math.PI;
        
        // Animate the wheel
        this.animateWheel(finalRotation);
    }
    
    respinWheel() {
        if (this.isSpinning || this.contestants.length < 2 || !this.hasSpun) return;
        
        this.isSpinning = true;
        this.updateButtons();
        
        // Show re-spinning message
        this.result.textContent = '🔄 Re-spinning...';
        this.result.className = 'result';
        
        // Random spin amount for re-spin (fewer rotations)
        const minSpins = 3;
        const maxSpins = 6;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        const finalRotation = spins * 2 * Math.PI;
        
        // Animate the wheel
        this.animateWheel(finalRotation);
    }
    
    animateWheel(finalRotation) {
        const startRotation = this.rotation;
        const totalRotation = finalRotation;
        const duration = 2500; // Reduced from 4000ms to 2.5 seconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.rotation = startRotation + totalRotation * easeOut;
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
        
        // Special case for coin toss (2 contestants)
        if (this.contestants.length === 2) {
            const flipRotation = this.rotation * 2;
            const normalizedFlip = Math.abs(flipRotation) % (2 * Math.PI);
            const flipFactor = Math.cos(normalizedFlip);
            const isHeads = flipFactor > 0;
            
            winner = isHeads ? this.contestants[0] : this.contestants[1];
            const coinSide = isHeads ? 'HEADS' : 'TAILS';
            
            // Display coin toss result
            this.result.textContent = `🪙 ${coinSide}! Winner: ${winner} 🎉`;
            this.result.className = 'result winner';
        } else {
            // Regular wheel calculation for 3+ contestants
            const normalizedRotation = this.rotation % (2 * Math.PI);
            const angleStep = (2 * Math.PI) / this.contestants.length;
            
            const topAngle = (3 * Math.PI / 2 - normalizedRotation) % (2 * Math.PI);
            const adjustedAngle = topAngle < 0 ? topAngle + 2 * Math.PI : topAngle;
            
            let winnerIndex = Math.floor(adjustedAngle / angleStep) % this.contestants.length;
            winner = this.contestants[winnerIndex];
            
            // Display wheel result
            this.result.textContent = `🎉 Winner: ${winner} 🎉`;
            this.result.className = 'result winner';
        }
        
        this.lastWinner = winner;
    }
}

// Initialize the wheel when the page loads
let wheel;
document.addEventListener('DOMContentLoaded', () => {
    wheel = new PickerWheel();
});
