import { CONFIG, LOGIC_FPS, FIXED_DT } from './config.js';
import { Vector } from './Vector.js';

let CTX = null;
let fixedFrames = 0;
let particles = [];
let bullets = [];
let items = [];
let player = null;
let boss = null;

// Set external references
export function setGameContext(context) {
    CTX = context;
}

export function setGameState(state) {
    fixedFrames = state.fixedFrames;
    particles = state.particles;
    bullets = state.bullets;
    items = state.items;
    player = state.player;
    boss = state.boss;
}

export function getGameState() {
    return { fixedFrames, particles, bullets, items, player, boss };
}

// === ENHANCED PARTICLE EFFECTS SYSTEM ===
export class ParticleEffect {
    static createBurst(x, y, count = 12, color = '#ffaa00', speed = 3) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const particle = getParticleFromPool(x, y, color);
            particle.vel.set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            particles.push(particle);
        }
    }
    
    static createWave(x, y, count = 8, color = '#0088ff', speed = 2) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + performance.now() * 0.005;
            const particle = getParticleFromPool(x, y, color);
            particle.vel.set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            particles.push(particle);
        }
    }
}

// === ENHANCED BULLET CLASS (HYBRID - FIXED LOGIC, INTERPOLATED RENDER) ===
export class Bullet {
    constructor(x, y, angle, speed, type, props = {}) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.radius = props.size || 4;
        this.color = props.color || CONFIG.colors.bulletWhite;
        this.type = type;
        this.props = props;
        this.timer = 0;
        this.active = true;
        this.id = Math.random();
        this.spawnFrame = fixedFrames;
        this.hasHitPlayer = false;
        
        // Visual-only properties
        this.visualAngle = angle;
    }
    
    reset(x, y, angle, speed, type, props) {
        this.pos.set(x, y);
        this.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.radius = props.size || 4;
        this.color = props.color || CONFIG.colors.bulletWhite;
        this.type = type;
        this.props = props;
        this.timer = 0;
        this.active = true;
        this.id = Math.random();
        this.spawnFrame = fixedFrames;
        this.hasHitPlayer = false;
        this.visualAngle = angle;
    }
    
    fixedUpdate() {
        this.pos.fixedUpdate();
        this.pos.add(this.vel);
        this.timer++;
        
        // Graze check - FIXED LOGIC
        if (this.type === 'boss' && player && fixedFrames - this.spawnFrame > 3) {
            const distSq = this.pos.distSq(player.pos);
            const checkDist = player.radius + this.radius + CONFIG.player.grazeDistance;
            const checkDistSq = checkDist * checkDist;
            
            if (distSq < checkDistSq) {
                player.graze(this);
            }
        }
        
        // Special behaviors - FIXED LOGIC
        if (this.props.homing && this.type === 'boss' && player) {
            this.applyHoming();
        }
        
        if (this.props.accel) this.vel.mult(this.props.accel);
        if (this.props.curve) {
            this.applyCurve();
        }
        
        // Boundary check
        if (this.pos.x < -50 || this.pos.x > window.innerWidth + 50 || 
            this.pos.y < -50 || this.pos.y > window.innerHeight + 50) {
            this.active = false;
        }
        
        if (this.props.lifespan && this.timer > this.props.lifespan) {
            this.active = false;
        }
        
        return this.active;
    }
    
    applyHoming() {
        const desired = new Vector(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
        desired.normalize().mult(this.vel.mag());
        const steer = desired.sub(this.vel).limit(0.12);
        this.vel.add(steer);
    }
    
    applyCurve() {
        const angle = Math.atan2(this.vel.y, this.vel.x) + this.props.curve;
        const mag = this.vel.mag();
        this.vel.x = Math.cos(angle) * mag;
        this.vel.y = Math.sin(angle) * mag;
        this.visualAngle = angle;
    }
    
    draw(alpha) {
        const interpPos = this.pos.interpolated(alpha);
        
        CTX.save();
        
        const glowPulse = Math.sin(performance.now() * 0.002) * 0.3 + 0.7;
        CTX.shadowBlur = 0 * glowPulse;
        CTX.shadowColor = this.color;
        
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(interpPos.x, interpPos.y, this.radius, 0, Math.PI * 2);
        CTX.fill();
        
        if (this.radius > 3) {
            CTX.fillStyle = 'white';
            CTX.beginPath();
            CTX.arc(interpPos.x, interpPos.y, this.radius * 0.6, 0, Math.PI * 2);
            CTX.fill();
        }
        
        CTX.restore();
    }
}

// === OPTIMIZED POINT ITEM CLASS (HYBRID) ===
export class PointItem {
    constructor(x, y, value = 1) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 2);
        this.radius = 6;
        this.color = '#ffff00';
        this.value = value;
        this.collected = false;
        this.active = true;
        this.rotation = Math.random() * Math.PI * 2;
        this.pulse = 0;
        this.glowIntensity = 0;
        this.collectTimer = 0;
        this.autoCollectRange = 150;
        
        // Visual-only properties
        this.visualRotation = this.rotation;
    }
    
    reset(x, y, value) {
        this.pos.set(x, y);
        this.vel.set(0, 2);
        this.radius = 6;
        this.color = '#ffff00';
        this.value = value;
        this.collected = false;
        this.active = true;
        this.rotation = Math.random() * Math.PI * 2;
        this.visualRotation = this.rotation;
        this.pulse = 0;
        this.glowIntensity = 0;
        this.collectTimer = 0;
    }
    
    fixedUpdate() {
        if (this.collected) {
            this.collectTimer++;
            if (this.collectTimer > 10) {
                this.active = false;
            }
            return this.active;
        }
        
        if (!player) return this.active;
        
        this.pos.fixedUpdate();
        
        this.pulse = Math.sin(fixedFrames * 0.1) * 0.5 + 0.5;
        this.rotation += 0.05;
        this.visualRotation = this.rotation;
        
        const isHigh = this.pos.y < window.innerHeight * 0.3;
        const inFocusRange = window.FOCUS_ACTIVE && this.pos.distSq(player.pos) < this.autoCollectRange * this.autoCollectRange;
        
        if (isHigh || inFocusRange) {
            const dx = player.pos.x - this.pos.x;
            const dy = player.pos.y - this.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const speed = inFocusRange ? 15 : 8;
                this.vel.x = (dx / dist) * speed;
                this.vel.y = (dy / dist) * speed;
            }
        }
        
        const distSq = this.pos.distSq(player.pos);
        const collectDist = player.radius + this.radius;
        const collectDistSq = collectDist * collectDist;
        
        if (distSq < collectDistSq) {
            this.collect();
        }
        
        this.pos.add(this.vel);
        this.vel.mult(0.95);
        
        if (this.pos.y > window.innerHeight + 50) {
            this.active = false;
        }
        
        return this.active;
    }
    
    collect() {
        if (this.collected) return;
        
        this.collected = true;
        this.collectTimer = 0;
        player.collectItem(this);
        
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i;
            const p = getParticleFromPool(
                this.pos.x, this.pos.y,
                this.color
            );
            p.vel.set(Math.cos(angle) * 3, Math.sin(angle) * 3);
            particles.push(p);
        }
    }
    
    draw(alpha) {
        if (this.collected) return;
        
        const interpPos = this.pos.interpolated(alpha);
        const visualGlow = Math.sin(performance.now() * 0.001) * 0.3 + 0.7;
        
        CTX.save();
        CTX.translate(interpPos.x, interpPos.y);
        CTX.rotate(this.visualRotation);
        
        CTX.shadowBlur = 0 * visualGlow;
        CTX.shadowColor = this.color;
        
        CTX.fillStyle = this.color;
        CTX.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
            const radius = this.radius * (i % 2 === 0 ? 1 : 0.5);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) CTX.moveTo(x, y);
            else CTX.lineTo(x, y);
        }
        CTX.closePath();
        CTX.fill();
        
        CTX.restore();
    }
}

// === ENHANCED POWER-UP ITEMS ===
export class PowerUpItem {
    constructor(x, y, type = 'power') {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 1.5);
        this.radius = 8;
        this.type = type; // 'power', 'fullpower', 'bomb', 'health', 'shield', 'slowtime'
        this.collected = false;
        this.active = true;
        this.rotation = Math.random() * Math.PI * 2;
        this.pulse = 0;
        this.collectTimer = 0;
        this.autoCollectRange = 200;
        
        this.colors = {
            power: '#ff8800',
            fullpower: '#ffff00',
            bomb: '#ff0000',
            health: '#00ff00',
            shield: '#00ffff',
            slowtime: '#aa00ff'
        };
        this.color = this.colors[type] || '#ff8800';
        this.visualRotation = this.rotation;
    }
    
    reset(x, y, type) {
        this.pos.set(x, y);
        this.vel.set(0, 1.5);
        this.type = type;
        this.collected = false;
        this.active = true;
        this.rotation = Math.random() * Math.PI * 2;
        this.visualRotation = this.rotation;
        this.pulse = 0;
        this.collectTimer = 0;
        this.color = this.colors[type] || '#ff8800';
    }
    
    fixedUpdate() {
        if (this.collected) {
            this.collectTimer++;
            if (this.collectTimer > 10) {
                this.active = false;
            }
            return this.active;
        }
        
        if (!player) return this.active;
        
        this.pos.fixedUpdate();
        this.pulse = Math.sin(fixedFrames * 0.08) * 0.5 + 0.5;
        this.rotation += 0.08;
        this.visualRotation = this.rotation;
        
        const isHigh = this.pos.y < window.innerHeight * 0.25;
        const inFocusRange = window.FOCUS_ACTIVE && this.pos.distSq(player.pos) < this.autoCollectRange * this.autoCollectRange;
        
        if (isHigh || inFocusRange) {
            const dx = player.pos.x - this.pos.x;
            const dy = player.pos.y - this.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const speed = inFocusRange ? 18 : 10;
                this.vel.x = (dx / dist) * speed;
                this.vel.y = (dy / dist) * speed;
            }
        }
        
        const distSq = this.pos.distSq(player.pos);
        const collectDist = player.radius + this.radius;
        const collectDistSq = collectDist * collectDist;
        
        if (distSq < collectDistSq) {
            this.collect();
        }
        
        this.pos.add(this.vel);
        this.vel.mult(0.92);
        
        if (this.pos.y > window.innerHeight + 50) {
            this.active = false;
        }
        
        return this.active;
    }
    
    collect() {
        if (this.collected) return;
        
        this.collected = true;
        this.collectTimer = 0;
        player.collectPowerUp(this);
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const p = getParticleFromPool(this.pos.x, this.pos.y, this.color);
            p.vel.set(Math.cos(angle) * 4, Math.sin(angle) * 4);
            particles.push(p);
        }
    }
    
    draw(alpha) {
        if (this.collected) return;
        
        const interpPos = this.pos.interpolated(alpha);
        const visualGlow = Math.sin(performance.now() * 0.0008) * 0.4 + 0.8;
        
        CTX.save();
        CTX.translate(interpPos.x, interpPos.y);
        CTX.rotate(this.visualRotation);
        
        CTX.shadowBlur = 8 * visualGlow;
        CTX.shadowColor = this.color;
        
        // Draw different shapes based on type
        switch(this.type) {
            case 'power':
            case 'fullpower':
                // Plus sign
                CTX.fillStyle = this.color;
                CTX.fillRect(-3, -10, 6, 20);
                CTX.fillRect(-10, -3, 20, 6);
                break;
            case 'bomb':
                // Circle with crosshairs
                CTX.fillStyle = this.color;
                CTX.beginPath();
                CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                CTX.fill();
                CTX.strokeStyle = '#ffffff';
                CTX.lineWidth = 1;
                CTX.beginPath();
                CTX.moveTo(-8, 0);
                CTX.lineTo(8, 0);
                CTX.moveTo(0, -8);
                CTX.lineTo(0, 8);
                CTX.stroke();
                break;
            case 'health':
                // Heart shape
                CTX.fillStyle = this.color;
                CTX.beginPath();
                CTX.arc(-4, -3, 4, 0, Math.PI * 2);
                CTX.arc(4, -3, 4, 0, Math.PI * 2);
                CTX.lineTo(8, 8);
                CTX.lineTo(0, 15);
                CTX.lineTo(-8, 8);
                CTX.closePath();
                CTX.fill();
                break;
            case 'shield':
                // Shield shape
                CTX.fillStyle = this.color;
                CTX.beginPath();
                CTX.moveTo(-6, -8);
                CTX.lineTo(6, -8);
                CTX.lineTo(8, 0);
                CTX.lineTo(0, 12);
                CTX.lineTo(-8, 0);
                CTX.closePath();
                CTX.fill();
                CTX.strokeStyle = '#ffffff';
                CTX.lineWidth = 1;
                CTX.stroke();
                break;
            case 'slowtime':
                // Hourglass shape
                CTX.fillStyle = this.color;
                CTX.beginPath();
                CTX.moveTo(-8, -10);
                CTX.lineTo(8, -10);
                CTX.lineTo(0, 0);
                CTX.lineTo(8, 10);
                CTX.lineTo(-8, 10);
                CTX.lineTo(0, 0);
                CTX.closePath();
                CTX.fill();
                break;
        }
        
        CTX.restore();
    }
}

// === OPTIMIZED PARTICLE CLASS (DELTA TIME ONLY - VISUAL EFFECT) ===
export class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        this.radius = Math.random() * 2 + 1;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.active = true;
    }
    
    reset(x, y, color) {
        this.pos.set(x, y);
        this.vel.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        this.radius = Math.random() * 2 + 1;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.active = true;
    }
    
    fixedUpdate() {
        return this.active;
    }
    
    updateVisual(deltaFactor) {
        this.pos.add(new Vector(this.vel.x * deltaFactor, this.vel.y * deltaFactor));
        this.life -= this.decay * deltaFactor;
        this.vel.mult(0.98);
        
        if (this.life <= 0) {
            this.active = false;
        }
        
        return this.active;
    }
    
    draw(alpha) {
        CTX.globalAlpha = this.life;
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        CTX.fill();
        CTX.globalAlpha = 1;
    }
}

// Pool management helpers
function getParticleFromPool(x, y, color) {
    if (CONFIG.performance.enableBulletPool && window.particlePool.length > 0) {
        const particle = window.particlePool.pop();
        particle.reset(x, y, color);
        return particle;
    }
    return new Particle(x, y, color);
}

export function returnParticleToPool(particle) {
    if (CONFIG.performance.enableBulletPool && window.particlePool.length < 200) {
        particle.active = false;
        window.particlePool.push(particle);
    }
}
