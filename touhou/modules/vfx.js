// Enhanced VFX System - Visual Effects Manager
// Handles all UI/UX visual enhancements and animations

const VFX = {
    enabled: true,
    particles: [],
    floatingTexts: [],
    
    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
    },
    
    // Create floating score/text effect
    createFloatingText(x, y, text, color = '#ffff00', duration = 60) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            duration,
            maxDuration: duration,
            size: 16,
            opacity: 1,
            velocityY: -2
        });
    },
    
    // Create hit flash effect
    createHitFlash(intensity = 1, duration = 10) {
        const hitEffect = document.getElementById('hit-effect');
        if (!hitEffect) return;
        
        hitEffect.style.opacity = (0.3 * intensity).toString();
        hitEffect.style.display = 'block';
        
        setTimeout(() => {
            hitEffect.style.opacity = '0';
            setTimeout(() => {
                hitEffect.style.display = 'none';
            }, 100);
        }, duration);
    },
    
    // Create screen shake (canvas-based)
    createScreenShake(intensity = 5, duration = 10) {
        const startTime = Date.now();
        const shakeDuration = duration;
        
        const applyShake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > shakeDuration) return;
            
            const progress = 1 - (elapsed / shakeDuration);
            const offsetX = (Math.random() - 0.5) * intensity * 2 * progress;
            const offsetY = (Math.random() - 0.5) * intensity * 2 * progress;
            
            this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            requestAnimationFrame(applyShake);
        };
        
        applyShake();
    },
    
    // Create particle burst effect
    createBurst(x, y, count = 10, color = '#ff8800') {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 30,
                size: 3 + Math.random() * 2,
                gravity: 0.1
            });
        }
    },
    
    // Create combo text animation
    createComboText(comboCount, x = window.innerWidth / 2, y = window.innerHeight / 3) {
        const text = `COMBO x${comboCount}`;
        const colors = ['#ffff00', '#ff8800', '#ff0000'];
        const colorIndex = Math.min(Math.floor(comboCount / 50), colors.length - 1);
        
        this.createFloatingText(x, y, text, colors[colorIndex], 120);
    },
    
    // Create graze visual effect
    createGrazeEffect(playerX, playerY) {
        this.createBurst(playerX, playerY, 6, '#00ffff');
        this.createFloatingText(playerX, playerY, 'GRAZE!', '#00ffff', 40);
    },
    
    // Create item pickup effect
    createItemPickup(x, y, itemType = 'standard') {
        const colors = {
            power: '#ff8800',
            fullpower: '#ffff00',
            bomb: '#ff0000',
            health: '#00ff00',
            shield: '#00ffff',
            slowtime: '#aa00ff',
            standard: '#ffff00'
        };
        
        const color = colors[itemType] || colors.standard;
        this.createBurst(x, y, 12, color);
        this.createFloatingText(x, y - 20, '+ITEM', color, 50);
    },
    
    // Create spell card start effect
    createSpellStart() {
        this.createScreenShake(8, 20);
        this.createFloatingText(
            window.innerWidth / 2,
            window.innerHeight / 4,
            'SPELL CARD!',
            '#ffff00',
            120
        );
    },
    
    // Create spell card clear effect
    createSpellClear() {
        this.createScreenShake(15, 30);
        this.createBurst(window.innerWidth / 2, window.innerHeight / 2, 30, '#00ff00');
        this.createFloatingText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'CLEAR!',
            '#00ff00',
            150
        );
    },
    
    // Create player damage effect
    createPlayerDamage(x, y) {
        this.createScreenShake(10, 15);
        this.createHitFlash(1.5, 150);
        this.createBurst(x, y, 20, '#ff0000');
    },
    
    // Create bomb explosion effect
    createBombExplosion(x, y) {
        this.createScreenShake(20, 50);
        this.createHitFlash(2, 200);
        this.createBurst(x, y, 40, '#ff8800');
        this.createFloatingText(x, y, 'BOMB!', '#ffaa00', 80);
    },
    
    // Create boss phase transition effect
    createBossPhaseTransition() {
        this.createScreenShake(12, 40);
        this.createFloatingText(
            window.innerWidth / 2,
            window.innerHeight / 3,
            'PHASE CHANGE!',
            '#ff0000',
            120
        );
    },
    
    // Render all floating texts
    drawFloatingTexts(ctx) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            
            text.duration--;
            text.y += text.velocityY;
            text.opacity = text.duration / text.maxDuration;
            
            if (text.duration <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }
            
            ctx.save();
            ctx.globalAlpha = text.opacity;
            ctx.fillStyle = text.color;
            ctx.font = `bold ${text.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.fillText(text.text, text.x, text.y);
            ctx.restore();
        }
    },
    
    // Render particles
    drawParticles(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.95;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            const opacity = p.life / 30;
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },
    
    // Update HUD with glow effects
    updateHUDGlow() {
        const hudRow = document.querySelector('.hud-row');
        if (!hudRow) return;
        
        const glowIntensity = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
        hudRow.style.boxShadow = `0 0 ${15 * glowIntensity}px rgba(0, 150, 255, ${0.5 * glowIntensity})`;
    },
    
    // Create screen glow effect
    setScreenGlow(color = '#00ffff', intensity = 0.1) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.style.boxShadow = `inset 0 0 ${30 * intensity}px ${color}`;
    },
    
    // Remove screen glow
    clearScreenGlow() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.style.boxShadow = 'none';
    },
    
    // Pulse animation for UI elements
    pulseElement(element, duration = 500) {
        if (!element) return;
        
        element.style.animation = 'none';
        setTimeout(() => {
            element.style.animation = `pulse ${duration}ms ease-out`;
        }, 10);
    },
    
    // Flash animation for UI elements
    flashElement(element, color = '#ffff00', flashes = 3) {
        if (!element) return;
        
        const original = element.style.color;
        let count = 0;
        
        const flash = setInterval(() => {
            count++;
            element.style.color = count % 2 === 0 ? original : color;
            
            if (count >= flashes * 2) {
                clearInterval(flash);
                element.style.color = original;
            }
        }, 100);
    },
    
    // Shake animation for UI elements
    shakeElement(element, intensity = 5, duration = 300) {
        if (!element) return;
        
        const startTime = Date.now();
        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                element.style.transform = 'translate(0, 0)';
                return;
            }
            
            const progress = 1 - (elapsed / duration);
            const offsetX = (Math.random() - 0.5) * intensity * progress;
            const offsetY = (Math.random() - 0.5) * intensity * progress;
            
            element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            requestAnimationFrame(shake);
        };
        
        shake();
    },
    
    // Create glitch effect (scan lines)
    createGlitchEffect(duration = 200) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        const lines = document.createElement('div');
        lines.style.position = 'absolute';
        lines.style.top = '0';
        lines.style.left = '0';
        lines.style.width = '100%';
        lines.style.height = '100%';
        lines.style.pointerEvents = 'none';
        lines.style.zIndex = '999';
        lines.style.background = 'repeating-linear-gradient(0deg, rgba(255,255,255,.1) 0px, rgba(255,255,255,.1) 2px, transparent 2px, transparent 4px)';
        lines.style.animation = `glitch-animation ${duration}ms forwards`;
        
        document.body.appendChild(lines);
        
        setTimeout(() => {
            lines.remove();
        }, duration);
    }
};

export default VFX;
