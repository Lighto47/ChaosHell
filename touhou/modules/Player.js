// Player class - Handles player character, movement, attacks, and bomb mechanics
import { CONFIG } from './config.js';
import { Vector } from './Vector.js';
import { getBulletFromPool, getItemFromPool, returnBulletToPool, returnItemToPool } from './pools.js';
import { getParticleFromPool } from './pools.js';
import { ParticleEffect } from './entities.js';
import { endGame, showStatus, addScore, createExplosion } from './main.js';
import SFX from './sfx.js';

export class Player {
    constructor(gameState) {
        this.gameState = gameState;
        this.pos = new Vector(this.gameState.WIDTH / 2, this.gameState.HEIGHT - 100);
        this.radius = 15;
        this.hitboxRadius = this.radius * CONFIG.player.hitboxScale;
        this.color = CONFIG.colors.player;
        
        this.lives = CONFIG.player.startLives;
        this.bombs = CONFIG.player.startBombs;
        this.invulFrames = 0;
        this.deathTimer = 0;
        this.hitThisFrame = false;
        
        this.power = CONFIG.player.powerStart;
        this.powerMax = CONFIG.player.powerMax;
        
        this.grazeCount = 0;
        this.grazedBullets = new Set();
        
        this.attackTimer = 0;
        this.bombActive = false;
        this.bombTimer = 0;
        
        this.moveTarget = new Vector(this.gameState.WIDTH / 2, this.gameState.HEIGHT - 100);
        this.velocity = new Vector(0, 0);
        this.speed = CONFIG.player.moveSpeed;
        
        this.autoBombCooldown = 0;
        this.dangerLevel = 0;
        
        this.rotation = 0;
    }
    
    fixedUpdate() {
        this.hitThisFrame = false;
        
        this.invulFrames = Math.max(0, this.invulFrames - 1);
        this.deathTimer = Math.max(0, this.deathTimer - 1);
        this.autoBombCooldown = Math.max(0, this.autoBombCooldown - 1);
        this.bombTimer = Math.max(0, this.bombTimer - 1);
        this.bombActive = this.bombTimer > 0;
        
        this.pos.fixedUpdate();
        
        this.fixedUpdateMovement();
        this.fixedUpdateAttack();
        this.fixedUpdateAutoBomb();
        this.fixedUpdateDangerLevel();
        
        this.updateUI();
    }
    
    fixedUpdateMovement() {
        this.gameState.FOCUS_ACTIVE = document.getElementById('btn-focus').classList.contains('active') || this.gameState.MULTI_TOUCH;
        
        if (this.gameState.FOCUS_ACTIVE) {
            this.speed = CONFIG.player.focusSpeed;
            this.color = CONFIG.colors.playerFocus;
        } else {
            this.speed = CONFIG.player.moveSpeed;
            this.color = CONFIG.colors.player;
        }
        
        const dx = this.moveTarget.x - this.pos.x;
        const dy = this.moveTarget.y - this.pos.y;
        const distanceSq = dx * dx + dy * dy;
        
        if (distanceSq > 1) {
            const distance = Math.sqrt(distanceSq);
            const moveSpeed = this.speed * (this.gameState.FOCUS_ACTIVE ? 1 : 1.2);
            const ratio = moveSpeed / distance;
            
            this.velocity.x = dx * ratio;
            this.velocity.y = dy * ratio;
            
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
        } else {
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
        }
        
        this.pos.x = Math.max(20, Math.min(this.gameState.WIDTH - 20, this.pos.x));
        this.pos.y = Math.max(20, Math.min(this.gameState.HEIGHT - 150, this.pos.y));
        
        this.rotation += this.velocity.x * 0.02;
    }
    
    fixedUpdateAttack() {
        if (this.bombActive) return;
        
        this.attackTimer++;
        
        let attackInterval = 5;
        if (this.power < 4) attackInterval = 8 - this.power * 0.5;
        else if (this.power < 8) attackInterval = 4;
        else if (this.power < 12) attackInterval = 3;
        else if (this.power < 16) attackInterval = 2.5;
        else if (this.power < 20) attackInterval = 2;
        else attackInterval = 1.5;
        
        if (this.attackTimer >= attackInterval) {
            this.attackTimer = 0;
            this.shoot();
        }
    }
    
    shoot() {
        const angleToBoss = Math.atan2(this.gameState.boss.pos.y - this.pos.y, this.gameState.boss.pos.x - this.pos.x);
        
        if (this.power < 4) {
            this.createBullet(angleToBoss, 15, '#ffaa00', 6);
        } else if (this.power < 8) {
            for (let i = -1; i <= 1; i++) {
                this.createBullet(angleToBoss + i * 0.18, 13, '#00ff88', 5);
            }
        } else if (this.power < 12) {
            for (let i = -2; i <= 2; i++) {
                this.createBullet(angleToBoss + i * 0.14, 11, '#0088ff', 4);
            }
        } else if (this.power < 16) {
            for (let i = -2; i <= 2; i++) {
                this.createBullet(angleToBoss + i * 0.11, 10, '#00ffff', 4);
            }
            this.createBullet(angleToBoss - Math.PI/3, 9, '#ff8800', 3);
            this.createBullet(angleToBoss + Math.PI/3, 9, '#ff8800', 3);
        } else if (this.power < 20) {
            for (let i = -3; i <= 3; i++) {
                this.createBullet(angleToBoss + i * 0.1, 9, '#ff00ff', 4);
            }
        } else {
            for (let i = -4; i <= 4; i++) {
                const bullet = getBulletFromPool(
                    this.pos.x, this.pos.y,
                    angleToBoss + i * 0.08, 8, 'player',
                    { color: '#ffffff', size: 4, homing: true }
                );
                this.gameState.bullets.push(bullet);
            }
        }
        
        if (Math.random() < 0.015 + this.power * 0.002 && this.gameState.items.length < CONFIG.performance.maxItems) {
            this.gameState.items.push(getItemFromPool(this.pos.x, this.pos.y, 1 + Math.floor(this.power / 6)));
        }
    }
    
    createBullet(angle, speed, color, size) {
        this.gameState.bullets.push(getBulletFromPool(
            this.pos.x, this.pos.y,
            angle, speed, 'player',
            { color: color, size: size }
        ));
    }
    
    fixedUpdateAutoBomb() {
        // Auto-bomb implementation would go here
    }
    
    fixedUpdateDangerLevel() {
        // Danger level calculation would go here
    }
    
    onHit() {
        if (this.hitThisFrame || this.invulFrames > 0) return;
        this.hitThisFrame = true;
        
        SFX.play('playerDamaged');
        
        if (this.deathTimer > 0 && this.bombs > 0) {
            this.deathbomb();
            return;
        }
        
        this.lives--;
        this.invulFrames = CONFIG.player.invulTime;
        this.deathTimer = CONFIG.player.deathbombWindow;
        
        const powerLoss = Math.min(this.power * 0.3, CONFIG.player.powerLossOnDeath * (this.power / 4));
        this.power = Math.max(CONFIG.player.powerStart, this.power - powerLoss);
        
        const hitEffect = document.getElementById('hit-effect');
        hitEffect.style.display = 'block';
        setTimeout(() => {
            hitEffect.style.display = 'none';
        }, 100);
        
        this.gameState.SHAKE_INTENSITY = 0;
        this.updateUI();
        
        if (this.lives <= 0) {
            setTimeout(() => {
                endGame(false);
            }, 500);
        }
    }
    
    deathbomb() {
        if (this.bombs === 0) return;
        
        this.bombs--;
        this.bombActive = true;
        this.bombTimer = 150;
        this.invulFrames = 80;
        this.autoBombCooldown = 180;
        
        let cleared = 0;
        for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
            if (this.gameState.bullets[i].type === 'boss') {
                const distSq = this.gameState.bullets[i].pos.distSq(this.pos);
                if (distSq < 122500) {
                    returnBulletToPool(this.gameState.bullets[i]);
                    this.gameState.bullets.splice(i, 1);
                    cleared++;
                }
            }
        }
        
        this.gameState.blasters = [];
        this.gameState.gasterDevourers = [];
        
        createExplosion(this.pos.x, this.pos.y, 40, '#ffff00');
        ParticleEffect.createWave(this.pos.x, this.pos.y, 16, '#ffff00', 6);
        this.gameState.SHAKE_INTENSITY = Math.max(this.gameState.SHAKE_INTENSITY, 15);
        
        const deathbombText = document.getElementById('deathbomb-text');
        deathbombText.style.display = 'block';
        deathbombText.innerText = `DEATHBOMB! (${cleared} bullets cleared)`;
        setTimeout(() => {
            deathbombText.style.display = 'none';
        }, 1200);
        
        addScore(15000 + cleared * 100);
        showStatus("DEATHBOMB! - Area cleared");
    }
    
    useBomb() {
        if (this.bombs > 0 && !this.bombActive && this.gameState.BOMB_COOLDOWN === 0) {
            this.bombs--;
            this.bombActive = true;
            this.bombTimer = 100;
            this.invulFrames = 60;
            this.gameState.BOMB_COOLDOWN = 30;
            
            let cleared = 0;
            for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
                if (this.gameState.bullets[i].type === 'boss') {
                    const distSq = this.gameState.bullets[i].pos.distSq(this.pos);
                    if (distSq < 62500) {
                        returnBulletToPool(this.gameState.bullets[i]);
                        this.gameState.bullets.splice(i, 1);
                        cleared++;
                    }
                }
            }
            
            this.gameState.boss.takeDamage(5000);
            
            createExplosion(this.pos.x, this.pos.y, 30, '#ffaa00');
            ParticleEffect.createWave(this.pos.x, this.pos.y, 12, '#ff6600', 5);
            this.gameState.SHAKE_INTENSITY = Math.max(this.gameState.SHAKE_INTENSITY, 12);
            
            addScore(cleared * 100);
            showStatus(`BOMB! - ${cleared} bullets cleared`);
        }
    }
    
    graze(bullet) {
        if (!this.grazedBullets.has(bullet.id)) {
            this.grazedBullets.add(bullet.id);
            this.grazeCount++;
            
            this.power = Math.min(this.powerMax, this.power + CONFIG.player.powerGainPerGraze * 1.5);
            
            const grazeScore = CONFIG.scoring.grazePoints * (1 + this.power / 6);
            addScore(grazeScore);
            
            ParticleEffect.createBurst(bullet.pos.x, bullet.pos.y, 4, '#00ffff', 1.5);
            
            if (Math.random() < 0.05 + this.power * 0.001 && this.gameState.items.length < CONFIG.performance.maxItems) {
                this.gameState.items.push(getItemFromPool(bullet.pos.x, bullet.pos.y, 1));
            }
            
            if (this.grazedBullets.size > 1000) {
                const values = Array.from(this.grazedBullets);
                this.grazedBullets = new Set(values.slice(500));
            }
        }
    }
    
    collectItem(item) {
        SFX.play('itemCollect');
        
        this.gameState.POINT_ITEMS += item.value;
        
        const powerGain = CONFIG.player.powerGainPerItem * item.value * (1 + this.power / 24);
        this.power = Math.min(this.powerMax, this.power + powerGain);
        
        const itemScore = CONFIG.scoring.pointItemValue * item.value * (1 + this.power / 12);
        addScore(itemScore);
        
        this.gameState.COMBO_COUNT++;
        this.gameState.COMBO_TIMER = 180;
    }
    
    collectPowerUp(powerUp) {
        SFX.play('itemCollect');
        
        switch(powerUp.type) {
            case 'power':
                this.power = Math.min(this.powerMax, this.power + 0.5);
                addScore(2000);
                break;
            case 'fullpower':
                this.power = this.powerMax;
                addScore(5000);
                break;
            case 'bomb':
                this.bombs = Math.min(this.bombs + 2, 12);
                addScore(3000);
                break;
            case 'health':
                this.lives = Math.min(this.lives + 1, 24);
                addScore(4000);
                break;
            case 'shield':
                this.shield = Math.min((this.shield || 0) + 1, 3);
                addScore(3500);
                showStatus("SHIELD ACTIVE!");
                break;
            case 'slowtime':
                this.gameState.SLOW_TIME_ACTIVE = true;
                this.gameState.SLOW_TIME_TIMER = 300;
                addScore(5000);
                showStatus("TIME SLOW!");
                break;
        }
        
        this.gameState.COMBO_COUNT += 2;
        this.gameState.COMBO_TIMER = 240;
    }
    
    updateUI() {
        document.getElementById('life-value').innerText = this.lives;
        document.getElementById('bomb-value').innerText = this.bombs;
        document.getElementById('power-value').innerText = this.power.toFixed(2);
        document.getElementById('graze-value').innerText = this.grazeCount;
        
        const bombBtn = document.getElementById('btn-bomb');
        if (this.gameState.BOMB_COOLDOWN > 0 || this.bombs === 0) {
            bombBtn.style.opacity = '0.5';
        } else {
            bombBtn.style.opacity = '1';
        }
        
        const focusBtn = document.getElementById('btn-focus');
        if (this.gameState.FOCUS_ACTIVE) {
            focusBtn.classList.add('active');
            focusBtn.style.background = 'rgba(0, 100, 255, 0.8)';
        } else {
            focusBtn.classList.remove('active');
            focusBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        }
    }
    
    draw(alpha) {
        const CTX = document.getElementById('gameCanvas').getContext('2d');
        const interpPos = this.pos.interpolated(alpha);
        
        CTX.save();
        CTX.translate(interpPos.x, interpPos.y);
        
        if (this.invulFrames > 0) {
            CTX.globalAlpha = (this.gameState.fixedFrames % 10 < 5) ? 0.4 : 0.8;
        }
        
        CTX.rotate(this.rotation * 0.1);
        
        const visualGlow = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
        CTX.shadowBlur = 0 * visualGlow;
        CTX.shadowColor = this.color;
        
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
        CTX.fill();
        
        CTX.fillStyle = this.gameState.FOCUS_ACTIVE ? '#ffffff' : '#cccccc';
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        CTX.fill();
        
        CTX.fillStyle = this.gameState.FOCUS_ACTIVE ? '#ff5555' : '#ff0000';
        CTX.beginPath();
        CTX.ellipse(0, -this.radius * 0.3, this.radius * 0.4, this.radius * 0.2, 0, 0, Math.PI * 2);
        CTX.fill();
        
        CTX.shadowBlur = 0;
        
        if (this.gameState.FOCUS_ACTIVE) {
            CTX.save();
            CTX.globalAlpha = 0.9;
            CTX.shadowBlur = 1;
            CTX.shadowColor = 'rgba(0, 255, 255, 0.8)';
            CTX.strokeStyle = 'rgba(0, 255, 255, 0.9)';
            CTX.lineWidth = 2;
            CTX.beginPath();
            CTX.arc(0, 0, this.hitboxRadius + 0.5, 0, Math.PI * 2);
            CTX.stroke();
            CTX.restore();

            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, Math.max(1.8, this.hitboxRadius * 0.25), 0, Math.PI * 2);
            CTX.fill();

            CTX.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            CTX.lineWidth = 1;
            CTX.beginPath();
            CTX.arc(0, 0, this.hitboxRadius + 2, 0, Math.PI * 2);
            CTX.stroke();
        }
        
        if (this.bombActive) {
            CTX.globalAlpha = 0.3;
            CTX.fillStyle = '#ffaa00';
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
            CTX.fill();
        }
        
        CTX.restore();
        CTX.globalAlpha = 1;
    }
}
