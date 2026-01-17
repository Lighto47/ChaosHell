// Special attack classes - GasterBlaster and GasterDevourer
import { Vector } from './Vector.js';
import SFX from './sfx.js';

let gameStateRef = null;

export function setGameStateRef(gs) {
    gameStateRef = gs;
}

export class GasterBlaster {
    constructor(x, y, targetX, targetY, options = {}) {
        this.pos = new Vector(x, y);
        this.targetPos = new Vector(targetX, targetY);
        this.angle = Math.atan2(targetY - y, targetX - x) - Math.PI / 2;
        this.prevAngle = this.angle;
        this.scale = options.scale || 1.0;
        this.duration = options.duration || 60;
        this.trackOnEnter = options.trackOnEnter || false;
        this.delayFire = options.delay || 40;
        this.timer = 0;
        this.state = 'enter';
        this.beamWidth = 0;
        this.maxBeamWidth = 35 * this.scale;
        this.beamLength = 1000;
        this.mouthOffset = 15;
        this.glowIntensity = 0;
        this.active = true;
        this.lockedAngle = null;
        
        this.visualAngle = this.angle;
        this.visualBeamWidth = 0;
        
        // DPS tracking
        this.lastHitFrame = -100;
        this.hitCooldown = 8; // frames between hits
        
        SFX.play('gasterBlasterEnter');
    }
    
    fixedUpdate() {
        this.timer++;
        
        this.prevAngle = this.visualAngle;
        this.pos.fixedUpdate();
        
        switch(this.state) {
            case 'enter':
                this.fixedUpdateEnter();
                break;
            case 'charge':
                this.fixedUpdateCharge();
                break;
            case 'fire':
                this.fixedUpdateFire();
                break;
            case 'leave':
                if (!this.fixedUpdateLeave()) {
                    return false;
                }
                break;
        }
        
        this.visualAngle = this.angle;
        return this.active;
    }
    
    fixedUpdateEnter() {
        if (this.trackOnEnter && gameStateRef && gameStateRef.fixedFrames % 5 === 0) {
            const targetAngle = Math.atan2(
                gameStateRef.player.pos.y - this.pos.y,
                gameStateRef.player.pos.x - this.pos.x
            ) - Math.PI / 2;

            let diff = targetAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            this.angle += diff * 0.19;
        }

        const targetX = this.targetPos.x - Math.cos(this.angle + Math.PI / 2) * 80;
        const targetY = this.targetPos.y - Math.sin(this.angle + Math.PI / 2) * 80;

        this.pos.x += (targetX - this.pos.x) * 0.15;
        this.pos.y += (targetY - this.pos.y) * 0.15;

        if (this.timer > this.delayFire) {
            this.state = 'charge';
            this.timer = 0;
        }
    }
    
    fixedUpdateCharge() {
        if (this.timer % 3 === 0) {
            this.pos.x += (Math.random() - 0.5) * 3;
            this.pos.y += (Math.random() - 0.5) * 3;
        }
        
        if (this.timer > 12) {
            this.state = 'fire';
            this.timer = 0;
            SFX.play('gasterBlasterFire');
            const hold = SFX.sounds.gasterBlasterHold;
    hold.loop = true;
            SFX.play('gasterBlasterHold');
            if (gameStateRef) {
                gameStateRef.SHAKE_INTENSITY = Math.max(gameStateRef.SHAKE_INTENSITY, 6 * this.scale);
            }
        }
    }
    
    fixedUpdateFire() {
        if (this.timer < 8) {
            this.beamWidth = this.maxBeamWidth * (this.timer / 8);
        }
        
        this.checkCollision();
        
        if (this.timer > this.duration) {
            this.state = 'leave';
            this.timer = 0;
            SFX.stop('gasterBlasterHold');
}

        }
    
    fixedUpdateLeave() {
        this.beamWidth *= 0.85;
        this.pos.x -= Math.cos(this.angle + Math.PI / 2) * 12;
        this.pos.y -= Math.sin(this.angle + Math.PI / 2) * 12;
        if (this.timer > 25) {
            this.active = false;
        }
        return this.active;
    }
    
    checkCollision() {
        if (!gameStateRef || !gameStateRef.player) return false;
        
        const player = gameStateRef.player;
        const mouthX = this.pos.x + Math.cos(this.angle + Math.PI / 2) * this.mouthOffset;
        const mouthY = this.pos.y + Math.sin(this.angle + Math.PI / 2) * this.mouthOffset;
        const dx = player.pos.x - mouthX;
        const dy = player.pos.y - mouthY;
        const rot = -(this.angle + Math.PI / 2);
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        const halfWidth = this.beamWidth * 0.5;
        const hitboxRadius = player.hitboxRadius;
        
        if (localY >= 15 && localY <= this.beamLength) {
            const xDist = Math.abs(localX);
            if (xDist <= halfWidth + hitboxRadius) {
                if (xDist <= halfWidth || 
                    (xDist - halfWidth) * (xDist - halfWidth) <= hitboxRadius * hitboxRadius) {
                    // Deal DPS damage - hit once per hitCooldown frames
                    const currentFrame = gameStateRef.fixedFrames;
                    if (currentFrame - this.lastHitFrame >= this.hitCooldown) {
                        player.onHit();
                        this.lastHitFrame = currentFrame;
                        return true;
                    }
                    return false;
                }
            }
        }
        return false;
    }
    
    draw(alpha) {
        const CTX = document.getElementById('gameCanvas').getContext('2d');
        CTX.save();
        
        const interpPos = this.pos.interpolated(alpha);
        const interpAngle = this.prevAngle + (this.visualAngle - this.prevAngle) * alpha;
        const interpBeamWidth = this.visualBeamWidth;
        
        CTX.translate(interpPos.x, interpPos.y);
        CTX.rotate(interpAngle);
        CTX.scale(this.scale, this.scale);
        
        if (this.state === 'fire' || this.state === 'leave') {
            const gradient = CTX.createLinearGradient(0, 0, 0, this.beamLength);
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
            
            CTX.save();
            CTX.translate(0, this.mouthOffset);
            CTX.globalAlpha = 0.15;
            CTX.fillStyle = gradient;
            CTX.fillRect(-interpBeamWidth/2 - 8, 0, interpBeamWidth + 16, this.beamLength);
            
            CTX.globalAlpha = 0.6;
            CTX.fillStyle = 'white';
            CTX.fillRect(-interpBeamWidth/2, 0, interpBeamWidth, this.beamLength);
            CTX.restore();
        }
        
        const visualGlow = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
        CTX.shadowBlur = 1 * visualGlow;
        CTX.shadowColor = 'cyan';
        CTX.fillStyle = 'white';
        CTX.beginPath();
        CTX.moveTo(-18, -28);
        CTX.quadraticCurveTo(0, -38, 18, -28);
        CTX.quadraticCurveTo(32, -8, 22, 8);
        CTX.lineTo(12, 28);
        CTX.lineTo(-12, 28);
        CTX.lineTo(-22, 8);
        CTX.quadraticCurveTo(-32, -8, -18, -28);
        CTX.fill();
        CTX.shadowBlur = 1;
        
        CTX.fillStyle = 'black';
        CTX.beginPath();
        CTX.ellipse(-12, -8, 4, 6, 0.3, 0, Math.PI * 2);
        CTX.fill();
        CTX.beginPath();
        CTX.ellipse(12, -8, 4, 6, -0.3, 0, Math.PI * 2);
        CTX.fill();
        
        if (this.state === 'fire') {
            const fixedFrames = gameStateRef ? gameStateRef.fixedFrames : 0;
            const blink = (fixedFrames % 12 < 6) ? 1 : 0;
            const pupilScale = 0.35 + blink * 0.15;

            CTX.fillStyle = '#ffdd33';
            CTX.beginPath();
            CTX.ellipse(-12, -8, 4 * pupilScale, 6 * pupilScale, 0.3, 0, Math.PI * 2);
            CTX.fill();
        }
        
        if (this.state === 'fire') {
            CTX.fillStyle = 'black';
            CTX.beginPath();
            CTX.ellipse(0, 22, 8, 4, 0, 0, Math.PI * 2);
            CTX.fill();
        }
        
        CTX.restore();
        
        this.visualBeamWidth = this.beamWidth;
    }
}

export class GasterDevourer {
    static _spriteCanvas = null;
    
    static _prepareSprite() {
        // No-op - we're using drawn graphics instead of canvas sprites
    }
    
    constructor(x, y, targetX, targetY, options = {}) {
        this.pos = new Vector(x, y);
        this.target = new Vector(targetX, targetY);
        this.angle = Math.atan2(targetY - y, targetX - x) - Math.PI / 2;
        this.prevAngle = this.angle;
        this.scale = options.scale || 1.0;
        this.type = 'devourer';
        this.state = 'aim';
        this.timer = 0;
        this.aimTime = options.aimTime || 50;
        this.chargeTime = options.chargeTime || 35;
        this.dashSpeed = options.dashSpeed || 1;
        this.vel = new Vector(0, 0);
        this.warningLength = 0;
        this.glowColor = '#8B00FF';
        this.eyeColor = '#FF0000';
        this.mouthOffset = 15;
        this.hitRadius = 30 * this.scale;
        this.active = true;
        this.vibration = { x: 0, y: 0 };
        this.hasHitPlayer = false;
        this.spawnTimer = 0;
        this.spawnWarningTime = 50;
        
        this.visualAngle = this.angle;
        
        SFX.play('gasterDevourerSpawn');
    }
    
    fixedUpdate() {
        this.timer++;
        this.spawnTimer++;
        
        this.prevAngle = this.visualAngle;
        this.pos.fixedUpdate();
        
        switch(this.state) {
            case 'aim':
                this.fixedUpdateAim();
                break;
            case 'charge':
                this.fixedUpdateCharge();
                break;
            case 'dash':
                this.fixedUpdateDash();
                break;
        }
        
        this.visualAngle = this.angle;
        
        return this.active;
    }
    
    fixedUpdateAim() {
        if (gameStateRef && gameStateRef.fixedFrames % 5 === 0 && gameStateRef.player) {
            const dx = gameStateRef.player.pos.x - this.pos.x;
            const dy = gameStateRef.player.pos.y - this.pos.y;
            this.dashAngle = Math.atan2(dy, dx);
            this.angle = this.dashAngle - Math.PI / 2;
        }
        
        this.warningLength = Math.min(1500, this.timer * 15);
        
        if (this.timer >= this.aimTime) {
            this.state = 'charge';
            this.timer = 0;
            SFX.play('gasterDevourerWarning');
            if (gameStateRef && gameStateRef.player) {
                this.target.set(gameStateRef.player.pos.x, gameStateRef.player.pos.y);
            }
        }
    }
    
    fixedUpdateCharge() {
        this.vibration.x = (Math.random() - 0.5) * 4;
        this.vibration.y = (Math.random() - 0.5) * 4;
        
        if (this.timer >= this.chargeTime) {
            this.state = 'dash';
            this.timer = 0;
            SFX.play('gasterDevourerDash');

            const dx = this.target.x - this.pos.x;
            const dy = this.target.y - this.pos.y;

            this.dashAngle = Math.atan2(dy, dx);

            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.vel.set(
                    Math.cos(this.dashAngle) * this.dashSpeed,
                    Math.sin(this.dashAngle) * this.dashSpeed
                );
            }

            if (gameStateRef) {
                gameStateRef.SHAKE_INTENSITY = Math.max(gameStateRef.SHAKE_INTENSITY, 8);
            }
        }
    }
    
    fixedUpdateDash() {
        this.pos.add(this.vel);
        
        if (!this.hasHitPlayer && gameStateRef && gameStateRef.player && gameStateRef.player.invulFrames <= 0) {
            const player = gameStateRef.player;
            const dx = this.pos.x - player.pos.x;
            const dy = this.pos.y - player.pos.y;
            const distSq = dx * dx + dy * dy;
            const hitRadiusSq = this.hitRadius * this.hitRadius;
            
            if (distSq < hitRadiusSq) {
                player.onHit();
                this.hasHitPlayer = true;
                this.active = false;
            }
        }
        
        const WIDTH = gameStateRef ? gameStateRef.WIDTH : 800;
        const HEIGHT = gameStateRef ? gameStateRef.HEIGHT : 600;
        
        if (this.pos.x < -100 || this.pos.x > WIDTH + 100 ||
            this.pos.y < -100 || this.pos.y > HEIGHT + 100 ||
            this.timer > 100) {
            this.active = false;
        }
    }
    
    draw(alpha) {
        const CTX = document.getElementById('gameCanvas').getContext('2d');
        CTX.save();
        
        const interpPos = this.pos.interpolated(alpha);
        const interpAngle = this.prevAngle + (this.visualAngle - this.prevAngle) * alpha;
        
        if (this.spawnTimer < this.spawnWarningTime) {
            CTX.save();

            const t = this.spawnTimer / this.spawnWarningTime;
            const alphaRing = (1 - t) * 0.8;
            const radius = this.hitRadius * (1.8 - t * 0.6);

            CTX.globalAlpha = alphaRing;
            CTX.strokeStyle = '#ff4444';
            CTX.lineWidth = 3;

            CTX.beginPath();
            CTX.arc(interpPos.x, interpPos.y, radius, 0, Math.PI * 2);
            CTX.stroke();

            CTX.globalAlpha = alphaRing * 0.5;
            CTX.lineWidth = 1.5;
            CTX.beginPath();
            CTX.arc(interpPos.x, interpPos.y, radius * 0.6, 0, Math.PI * 2);
            CTX.stroke();

            CTX.restore();
        }

        if (this.spawnTimer < this.spawnWarningTime && gameStateRef && gameStateRef.player) {
            CTX.save();

            const playerInterpPos = gameStateRef.player.pos.interpolated(alpha);
            const dx = interpPos.x - playerInterpPos.x;
            const dy = interpPos.y - playerInterpPos.y;
            const angle = Math.atan2(dy, dx);

            const arrowDist = 60;
            const ax = playerInterpPos.x + Math.cos(angle) * arrowDist;
            const ay = playerInterpPos.y + Math.sin(angle) * arrowDist;

            CTX.translate(ax, ay);
            CTX.rotate(angle);

            const t = this.spawnTimer / this.spawnWarningTime;
            const arrowAlpha = (1 - t) * 0.9;

            CTX.globalAlpha = arrowAlpha;
            CTX.fillStyle = '#ff4444';
            CTX.strokeStyle = '#ffffff';
            CTX.lineWidth = 2;
            CTX.scale(1 + t * 0.4, 1 + t * 0.4);

            CTX.beginPath();
            CTX.moveTo(0, 0);
            CTX.lineTo(-14, -8);
            CTX.lineTo(-10, 0);
            CTX.lineTo(-14, 8);
            CTX.closePath();
            CTX.fill();
            CTX.stroke();

            CTX.restore();
        }
        
        const drawX = interpPos.x + this.vibration.x;
        const drawY = interpPos.y + this.vibration.y;
        
        CTX.translate(drawX, drawY);
        CTX.rotate(interpAngle);
        CTX.scale(this.scale, this.scale);
        
        CTX.shadowBlur = 0;
        CTX.shadowColor = this.glowColor;
        
        CTX.fillStyle = '#3d0275';
        CTX.beginPath();
        CTX.moveTo(-20, -28);
        CTX.quadraticCurveTo(0, -36, 20, -28);
        CTX.quadraticCurveTo(32, -12, 24, 12);
        CTX.lineTo(16, 28);
        CTX.lineTo(-16, 28);
        CTX.lineTo(-24, 12);
        CTX.quadraticCurveTo(-32, -12, -20, -28);
        CTX.fill();
        
        CTX.fillStyle = this.eyeColor;
        CTX.beginPath();
        CTX.ellipse(-12, -6, 3, 5, 0.2, 0, Math.PI * 2);
        CTX.fill();
        CTX.beginPath();
        CTX.ellipse(12, -6, 3, 5, -0.2, 0, Math.PI * 2);
        CTX.fill();
        
        if (this.state === 'charge' || this.state === 'dash') {
            const fixedFrames = gameStateRef ? gameStateRef.fixedFrames : 0;
            const pulse = Math.sin(fixedFrames * 0.35) * 0.5 + 0.5;
            const pupilScale = 0.35 + pulse * 0.15;

            CTX.fillStyle = '#00ccff';
            CTX.beginPath();
            CTX.ellipse(-12, -6, 3 * pupilScale, 5 * pupilScale, 0.2, 0, Math.PI * 2);
            CTX.fill();
        }
        
        if (this.state === 'charge' || this.state === 'dash') {
            CTX.fillStyle = '#400080';
            const fixedFrames = gameStateRef ? gameStateRef.fixedFrames : 0;
            const mouthSize = 2 + Math.sin(fixedFrames * 0.2) * 1.5;
            CTX.beginPath();
            CTX.ellipse(0, 24, 12 + mouthSize, 6, 0, 0, Math.PI * 2);
            CTX.fill();
        }
        
        CTX.restore();
    }
}
