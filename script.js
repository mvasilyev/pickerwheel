class PickerWheel {
    constructor() {
        this.contestants = [];
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isSpinning = false;
        this.rotation = 0;
        this.hasSpun = false;
        this.lastWinner = null;
        
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
    
    generateColors(count) {
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
        
        // Random spin amount (multiple rotations + random angle)
        const minSpins = 5;
        const maxSpins = 10;
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
        
        // Random spin amount for re-spin
        const minSpins = 5;
        const maxSpins = 10;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        const finalRotation = spins * 2 * Math.PI;
        
        // Animate the wheel
        this.animateWheel(finalRotation);
    }
    
    animateWheel(finalRotation) {
        const startRotation = this.rotation;
        const totalRotation = finalRotation;
        const duration = 4000; // 4 seconds
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
        
        // Calculate winner
        const normalizedRotation = this.rotation % (2 * Math.PI);
        const angleStep = (2 * Math.PI) / this.contestants.length;
        
        // The pointer is at the top pointing down
        // We need to find which segment is at the top (angle = -PI/2 or 3*PI/2)
        // Since wheel rotates clockwise and segments start at angle 0 (right side)
        // The top position is at -PI/2, so we need to adjust for that
        const topAngle = (3 * Math.PI / 2 - normalizedRotation) % (2 * Math.PI);
        const adjustedAngle = topAngle < 0 ? topAngle + 2 * Math.PI : topAngle;
        
        let winnerIndex = Math.floor(adjustedAngle / angleStep) % this.contestants.length;
        
        const winner = this.contestants[winnerIndex];
        this.lastWinner = winner;
        
        // Display result
        this.result.textContent = `🎉 Winner: ${winner} 🎉`;
        this.result.className = 'result winner';
    }
}

// Initialize the wheel when the page loads
let wheel;
document.addEventListener('DOMContentLoaded', () => {
    wheel = new PickerWheel();
});
