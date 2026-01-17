// Boss class - Handles boss AI, spell patterns, and enemy behavior
import { CONFIG } from './config.js';
import { Vector } from './Vector.js';
import { getBulletFromPool, returnBulletToPool } from './pools.js';
import { getItemFromPool, returnItemToPool } from './pools.js';
import { ParticleEffect } from './entities.js';
import { showStatus, addScore, createExplosion } from './main.js';
import { GasterBlaster, GasterDevourer } from './SpecialAttacks.js';
import SFX from './sfx.js';

export class Boss {
    constructor(gameState) {
        this.gameState = gameState;
        this.pos = new Vector(this.gameState.WIDTH / 2, 120);
        this.radius = 32;
        this.color = CONFIG.colors.boss;
        
        this.spellCards = CONFIG.boss.totalSpells;
        this.currentSpell = 1;
        this.spellHp = CONFIG.boss.maxHpPerSpell;
        this.spellMaxHp = CONFIG.boss.maxHpPerSpell;
        this.spellTimer = 0;
        this.spellDuration = CONFIG.boss.spellDuration;
        this.spellName = "Hư Thức: Phán Xét";
        this.spellCompleted = false;
        
        this.phase = 'gaster_only';
        this.phaseTimer = 0;
        this.actionTimer = 0;
        this.patternTimer = 0;
        this.orbs = [];
        this.orbShootCooldown = 0;
        
        this.gasterBlasterCooldown = 0;
        this.gasterDevourerCooldown = 0;
        this.specialPatternCooldown = 0;
    }
    
    fixedUpdate() {
        this.actionTimer++;
        this.phaseTimer++;
        this.patternTimer++;
        this.spellTimer++;
        
        this.pos.fixedUpdate();
        
        this.gasterBlasterCooldown = Math.max(0, this.gasterBlasterCooldown - 1);
        this.gasterDevourerCooldown = Math.max(0, this.gasterDevourerCooldown - 1);
        this.specialPatternCooldown = Math.max(0, this.specialPatternCooldown - 1);
        this.orbShootCooldown = Math.max(0, this.orbShootCooldown - 1);
        
        if (this.spellTimer >= this.spellDuration && !this.spellCompleted) {
            this.spellCompleted = true;
            showStatus("SPELL CARD TIME OUT!");
            this.endSpell();
        }
        
        const targetX = this.gameState.WIDTH / 2 + Math.sin(this.gameState.fixedFrames * 0.008) * 130;
        const targetY = 100 + Math.sin(this.gameState.fixedFrames * 0.005) * 30;
        this.pos.x += (targetX - this.pos.x) * 0.05;
        this.pos.y += (targetY - this.pos.y) * 0.05;
        
        if (this.phaseTimer > this.getPhaseDuration()) {
            this.transitionToNextPhase();
        }
        
        this.spawnDanmaku();
        this.spawnSpecialAttacks();
        this.updateOrbs();
        this.updateSpecialEntities();
    }
    
    getPhaseDuration() {
        const durations = {
            normal: 600,
            red: 800,
            blue: 700,
            purple: 900,
            yellow: 750,
            gaster_only: 1300,
            rainbow: 1200,
            final: 1500
        };
        return durations[this.phase] || 600;
    }
    
    transitionToNextPhase() {
        const phases = CONFIG.boss.phases;
        const currentIndex = phases.indexOf(this.phase);
        let nextIndex = currentIndex + 1;
        
        if (nextIndex >= phases.length) {
            nextIndex = 0;
        }
        
        if (this.spellHp < this.spellMaxHp * 0.2 && Math.random() < 0.3) {
            this.changePhase('final');
        } else {
            this.changePhase(phases[nextIndex]);
        }
    }
    
    changePhase(newPhase) {
        SFX.play('bossPhaseChange');
        
        this.phase = newPhase;
        this.phaseTimer = 0;
        this.actionTimer = 0;
        
        const phaseNames = {
            normal: "Hư Thức: Phán Xét",
            red: "Huyết Tế: Bỉ Ngạn Hoa Khai",
            blue: "Thương Lam: Vong Giới",
            purple: "Tử Vong: U Ám Vực Sâu",
            cyan: "Ngọc Cô: Tường Sơn Phong Vũ",
            green: "Xanh Lá: Sinh Mệnh Lũ Gợi",
            pink: "Trắng Hồng: Hoa Anh Đào Linh",
            white: "Tinh Trắng: Cơn Bão Tinh Thể",
            yellow: "Hoàng Kim: Thần Quang",
            gaster_only: "Hư Thức: Tuyệt Đối Hủy Diệt",
            rainbow: "Thất Sắc: Vũ Điệu Hỗn Độn",
            final: "TẬN THẾ: CHUNG CỤC PHÁN QUYẾT"
        };
        
        this.spellName = phaseNames[newPhase] || "Hư Thức: Phán Xét";
        
        if (newPhase === 'blue' || newPhase === 'rainbow') {
            this.spawnOrbs();
        }
        
        if (newPhase === 'final') {
            this.gameState.SHAKE_INTENSITY = 0;
            showStatus("CẢNH BÁO: GIAI ĐOẠN CUỐI CÙNG!");
        }
        
        showStatus(`SPELL CARD: ${this.spellName}`);
    }
    
    spawnDanmaku() {
        // Spawn bullets based on current phase
        switch(this.phase) {
            case 'normal':
                this.patternNormal();
                break;
            case 'red':
                this.patternRed();
                break;
            case 'blue':
                this.patternBlue();
                break;
            case 'purple':
                this.patternPurple();
                break;
            case 'cyan':
                this.patternCyan();
                break;
            case 'green':
                this.patternGreen();
                break;
            case 'pink':
                this.patternPink();
                break;
            case 'white':
                this.patternWhite();
                break;
            case 'yellow':
                this.patternYellow();
                break;
            case 'gaster_only':
                this.patternGasterOnly();
                break;
            case 'rainbow':
                this.patternRainbow();
                break;
            case 'final':
                this.patternFinal();
                break;
        }
    }
    
    fireRing(count, speed, offsetAngle, color, size, props = {}) {
        const step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = offsetAngle + i * step;
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, angle, speed, 'boss',
                { color: color, size: size, ...props }
            ));
        }
    }

    fireNWay(ways, spreadAngle, speed, color, size) {
        const baseAngle = Math.atan2(this.gameState.player.pos.y - this.pos.y, this.gameState.player.pos.x - this.pos.x);
        const startAngle = baseAngle - spreadAngle / 2;
        const step = spreadAngle / (ways - 1);
        
        for (let i = 0; i < ways; i++) {
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, startAngle + i * step, speed, 'boss',
                { color: color, size: size }
            ));
        }
    }
    
    spawnOrbs() {
        this.orbs = [];
        const count = this.phase === 'rainbow' ? 8 : 4;
        for (let i = 0; i < count; i++) {
            this.orbs.push({
                angle: (Math.PI * 2 / count) * i,
                distance: 90,
                speed: 0.03,
                color: this.phase === 'rainbow' ? 
                    ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#0000ff', '#8800ff', '#ff00ff'][i] :
                    '#0088ff',
                x: 0, y: 0
            });
        }
    }
    
    updateOrbs() {
        this.orbs.forEach(orb => {
            orb.angle += orb.speed;
            orb.x = this.pos.x + Math.cos(orb.angle) * orb.distance;
            orb.y = this.pos.y + Math.sin(orb.angle) * orb.distance;
            
            if (this.orbShootCooldown === 0) {
                const angleToPlayer = Math.atan2(this.gameState.player.pos.y - orb.y, this.gameState.player.pos.x - orb.x);
                this.gameState.bullets.push(getBulletFromPool(
                    orb.x, orb.y, angleToPlayer, 6, 'boss',
                    { color: orb.color, size: 3 }
                ));
            }
        });
        
        if (this.orbShootCooldown === 0) {
            this.orbShootCooldown = 45;
        }
    }
    
    fireRing(count, speed, offsetAngle, color, size, props = {}) {
        const step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = offsetAngle + i * step;
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, angle, speed, 'boss',
                { color: color, size: size, ...props }
            ));
        }
    }

    fireNWay(ways, spreadAngle, speed, color, size) {
        const baseAngle = Math.atan2(this.gameState.player.pos.y - this.pos.y, this.gameState.player.pos.x - this.pos.x);
        const startAngle = baseAngle - spreadAngle / 2;
        const step = spreadAngle / (ways - 1);
        
        for (let i = 0; i < ways; i++) {
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, startAngle + i * step, speed, 'boss',
                { color: color, size: size }
            ));
        }
    }
    
    patternNormal() {
        if (this.gameState.fixedFrames % 4 === 0) {
            const angle = Math.atan2(this.gameState.player.pos.y - this.pos.y, this.gameState.player.pos.x - this.pos.x);
            const spread = Math.sin(this.gameState.fixedFrames * 0.1) * 0.1;
            
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, angle + spread, 5.5, 'boss',
                { color: CONFIG.colors.bulletWhite, size: 4 }
            ));
        }
        
        if (this.actionTimer % 120 === 0) {
            this.fireRing(24, 2.5, 0, '#aaaaaa', 5);
        }
        
        if (this.actionTimer % 60 === 30) {
            this.fireNWay(3, 0.4, 7, '#ffffff', 3);
        }
    }
    
    patternRed() {
        const freq = 8;
        if (this.gameState.fixedFrames % freq === 0) {
            const t = this.gameState.fixedFrames / freq;
            const angle1 = Math.PI / 2 + Math.sin(t * 0.1) * 0.8;
            const angle2 = Math.PI / 2 - Math.sin(t * 0.1) * 0.8;
            
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x - 30, this.pos.y, angle1, 5, 'boss',
                { color: CONFIG.colors.bulletRed, size: 4 }
            ));
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x - 30, this.pos.y, angle1 + Math.PI, 5, 'boss',
                { color: CONFIG.colors.bulletRed, size: 4 }
            ));

            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x + 30, this.pos.y, angle2, 5, 'boss',
                { color: '#ff8888', size: 4 }
            ));
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x + 30, this.pos.y, angle2 + Math.PI, 5, 'boss',
                { color: '#ff8888', size: 4 }
            ));
        }

        if (this.actionTimer % 90 === 0) {
            this.fireRing(32, 4, this.gameState.fixedFrames * 0.01, '#ff0000', 3);
        }
    }
    
    patternBlue() {
        if (this.gameState.fixedFrames % 4 === 0) {
            const arms = 4;
            const spinSpeed = 0.03;
            const baseAngle = this.gameState.fixedFrames * spinSpeed;
            
            for (let i = 0; i < arms; i++) {
                const angle = baseAngle + (Math.PI * 2 / arms) * i;
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, angle, 4, 'boss',
                    { 
                        color: CONFIG.colors.bulletBlue, 
                        size: 4,
                        curve: 0.006
                    }
                ));
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, angle, 3, 'boss',
                    { 
                        color: '#88ccff', 
                        size: 3,
                        curve: 0.008
                    }
                ));
            }
        }
        
        if (this.actionTimer % 140 === 0) {
            this.fireNWay(5, 0.5, 3, '#00ffff', 6);
        }
    }
    
    patternPurple() {
        if (this.gameState.fixedFrames % 10 === 0) {
            const width = this.gameState.WIDTH * 0.8;
            const startX = (this.gameState.WIDTH - width) / 2;
            const count = 8;
            const step = width / (count - 1);
            
            const shift = Math.sin(this.gameState.fixedFrames * 0.02) * 40;
            
            for (let i = 0; i < count; i++) {
                this.gameState.bullets.push(getBulletFromPool(
                    startX + i * step + shift, 0, Math.PI / 2, 3, 'boss',
                    { 
                        color: CONFIG.colors.bulletPurple, 
                        size: 5,
                        accel: 1.01
                    }
                ));
            }
        }

        if (this.gameState.fixedFrames % 60 === 0) {
            this.fireRing(16, 3, this.gameState.fixedFrames * 0.02, '#ff00ff', 3);
        }
    }
    
    patternYellow() {
        if (this.gameState.fixedFrames % 3 === 0) {
            const rays = 6;
            const rot = this.gameState.fixedFrames * 0.015 + Math.sin(this.gameState.fixedFrames * 0.005);
            
            for (let i = 0; i < rays; i++) {
                const angle = rot + (Math.PI * 2 / rays) * i;
                
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, angle, 7, 'boss',
                    { color: '#ffff00', size: 4 }
                ));
                
                if (this.gameState.fixedFrames % 6 === 0) {
                    this.gameState.bullets.push(getBulletFromPool(
                        this.pos.x, this.pos.y, angle + 0.05, 4, 'boss',
                        { color: '#aa8800', size: 3 }
                    ));
                }
            }
        }
    }
    
    patternCyan() {
        if (this.gameState.fixedFrames % 5 === 0) {
            const waves = 3;
            for (let w = 0; w < waves; w++) {
                const t = this.gameState.fixedFrames * 0.012 + w * 1.2;
                const angle = Math.sin(t) * 0.5 + Math.PI / 2;
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x + Math.cos(t) * 80, this.pos.y, angle, 4, 'boss',
                    { color: '#00ffff', size: 3 }
                ));
            }
        }

        if (this.actionTimer % 180 === 0) {
            this.fireRing(20, 5, this.gameState.fixedFrames * 0.015, '#00ddff', 4);
        }
    }

    patternGreen() {
        if (this.gameState.fixedFrames % 6 === 0) {
            const branches = 4;
            const t = this.gameState.fixedFrames * 0.02;
            
            for (let i = 0; i < branches; i++) {
                const baseAngle = (Math.PI * 2 / branches) * i + t;
                const spread = Math.sin(this.gameState.fixedFrames * 0.008) * 0.3;
                
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, baseAngle + spread, 6, 'boss',
                    { color: '#00ff00', size: 3, curve: 0.004 }
                ));
                
                if (this.gameState.fixedFrames % 12 === 0) {
                    this.gameState.bullets.push(getBulletFromPool(
                        this.pos.x, this.pos.y, baseAngle, 3, 'boss',
                        { color: '#88ff88', size: 2, homing: true }
                    ));
                }
            }
        }
        
        if (this.actionTimer % 120 === 0) {
            this.fireNWay(7, 0.6, 5, '#00ff00', 4);
        }
    }

    patternPink() {
        if (this.gameState.fixedFrames % 4 === 0) {
            const petals = 8;
            const t = this.gameState.fixedFrames * 0.025;
            const radius = 60 + Math.sin(t) * 30;
            
            for (let i = 0; i < petals; i++) {
                const angle = (Math.PI * 2 / petals) * i + t;
                const x = this.pos.x + Math.cos(angle) * radius;
                const y = this.pos.y + Math.sin(angle) * radius;
                
                const toPlayerX = this.gameState.player.pos.x - x;
                const toPlayerY = this.gameState.player.pos.y - y;
                const targetAngle = Math.atan2(toPlayerY, toPlayerX);
                
                this.gameState.bullets.push(getBulletFromPool(
                    x, y, targetAngle, 3.5, 'boss',
                    { color: '#ff44ff', size: 3 }
                ));
            }
        }

        if (this.actionTimer % 150 === 0) {
            const count = 24;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, angle, 4, 'boss',
                    { color: '#ff88ff', size: 2, accel: 0.98 }
                ));
            }
        }
    }

    patternWhite() {
        if (this.gameState.fixedFrames % 8 === 0) {
            const rings = Math.floor(this.gameState.fixedFrames / 100) % 3;
            const baseAngle = this.gameState.fixedFrames * 0.008;
            
            for (let r = 0; r <= rings; r++) {
                const bulletCount = 16 + r * 8;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = baseAngle + (Math.PI * 2 / bulletCount) * i;
                    const speed = 2 + r * 0.8;
                    this.gameState.bullets.push(getBulletFromPool(
                        this.pos.x, this.pos.y, angle, speed, 'boss',
                        { color: '#ffffff', size: 2 }
                    ));
                }
            }
        }

        if (this.actionTimer % 200 === 0) {
            for (let i = 0; i < 6; i++) {
                this.fireRing(28, 2.5 + i * 0.6, this.gameState.fixedFrames * 0.02, '#dddddd', 2);
            }
        }
    }

    patternGasterOnly() {
        if (this.actionTimer % 120 === 0) {
            showStatus("GASTER: KHÔNG GIAN HỖN LOẠN");
        }
    }
    
    patternRainbow() {
        if (this.actionTimer % 45 === 0) {
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#0000ff', '#8800ff'];
            const col = colors[(Math.floor(this.actionTimer / 45)) % 7];
            this.fireRing(36, 3, this.gameState.fixedFrames * 0.01, col, 4);
        }
        
        if (this.gameState.fixedFrames % 4 === 0) {
            const angle1 = this.gameState.fixedFrames * 0.04;
            const angle2 = -this.gameState.fixedFrames * 0.04;
            
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, angle1, 5, 'boss',
                { color: '#ffffff', size: 3 }
            ));
            this.gameState.bullets.push(getBulletFromPool(
                this.pos.x, this.pos.y, angle2, 5, 'boss',
                { color: '#ffffff', size: 3 }
            ));
        }
    }
    
    patternFinal() {
        const subPhase = Math.floor(this.actionTimer / 300) % 3;
        
        if (subPhase === 0) {
            if (this.gameState.fixedFrames % 5 === 0) {
                const petals = 5;
                const t = this.gameState.fixedFrames * 0.02;
                for(let i = 0; i < petals; i++) {
                    const base = t + (Math.PI * 2 / petals) * i;
                    const wiggle = Math.sin(this.gameState.fixedFrames * 0.1) * 0.3;
                    
                    this.gameState.bullets.push(getBulletFromPool(
                        this.pos.x, this.pos.y, base + wiggle, 4, 'boss',
                        { color: '#ff0044', size: 4 }
                    ));
                }
            }
        } 
        else if (subPhase === 1) {
            if (this.actionTimer % 60 === 0) {
                const count = 24;
                for(let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i;
                    this.gameState.bullets.push(getBulletFromPool(
                        this.pos.x, this.pos.y, angle, 6, 'boss',
                        { color: '#4400ff', size: 5, accel: 0.92 }
                    ));
                }
            }
            if (this.gameState.fixedFrames % 10 === 0) {
                this.fireNWay(1, 0, 4, '#ffaa00', 3);
            }
        }
        else {
            if (this.gameState.fixedFrames % 8 === 0) {
                const t = this.gameState.fixedFrames * 0.03;
                this.fireRing(12, 3, t, '#ff0000', 3);
                this.fireRing(12, 4, -t, '#0000ff', 3);
            }
        }
        
        if (this.actionTimer % 500 === 499) {
            this.gameState.SHAKE_INTENSITY = 0;
            showStatus("PHÁN QUYẾT CUỐI CÙNG!");
            for(let r = 2; r <= 6; r += 1) {
                this.fireRing(40, r, 0, '#ffffff', 4);
            }
        }
    }
    
    spawnSpecialAttacks() {
        if (this.gasterBlasterCooldown === 0) {
            const canSpawnBlaster = 
                (this.phase === 'gaster_only' && Math.random() < 0.05) ||
                (this.phase === 'final' && Math.random() < 0.08) ||
                (this.phase === 'purple' && Math.random() < 0.03) ||
                (this.phase === 'rainbow' && Math.random() < 0.02);
            
            if (canSpawnBlaster && this.gameState.blasters.length < CONFIG.performance.maxGasterBlasters) {
                this.spawnGasterBlasterPattern();
                this.gasterBlasterCooldown = 120;
            }
        }
        
        if (this.gasterDevourerCooldown === 0) {
            const canSpawnDevourer = 
                (this.phase === 'gaster_only' && Math.random() < 0.04) ||
                (this.phase === 'final' && Math.random() < 0.06) ||
                (this.phase === 'red' && Math.random() < 0.02) ||
                (this.phase === 'yellow' && Math.random() < 0.01);
            
            if (canSpawnDevourer && this.gameState.gasterDevourers.length < CONFIG.performance.maxGasterDevourers) {
                this.spawnGasterDevourerPattern();
                this.gasterDevourerCooldown = 180;
            }
        }
        
        if (this.specialPatternCooldown === 0) {
            if (this.phase === 'final' && Math.random() < 0.02) {
                this.spawnUltimatePattern();
                this.specialPatternCooldown = 300;
            }
        }
    }
    
    spawnGasterBlasterPattern() {
        const patterns = [
            this.spawnGasterBlasterCircle.bind(this),
            this.spawnGasterBlasterAimed.bind(this),
            this.spawnGasterBlasterCross.bind(this),
            this.spawnGasterBlasterSpiral.bind(this),
            this.spawnGasterBlasterRandomAim.bind(this),
            this.spawnGasterBlasterSnapCircle.bind(this),
            this.spawnGasterBlasterWallPressure.bind(this),
            this.spawnGasterBlasterGiant.bind(this)
        ];

        const patternIndex = Math.floor(Math.random() * patterns.length);
        patterns[patternIndex]();
    }
    
    spawnGasterBlasterCircle() {
        const num = 7 + Math.floor(Math.random() * 8);
        const radius = 200 + Math.random() * 200;
        const centerX = this.gameState.player.pos.x + (Math.random() - 0.5) * 100;
        const centerY = this.gameState.player.pos.y + (Math.random() - 0.5) * 100;
        
        for (let i = 0; i < num; i++) {
            const angle = (Math.PI * 2 / num) * i;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            setTimeout(() => {
                this.gameState.blasters.push(new GasterBlaster(x, y, centerX, centerY, {
                    delay: 30 + i * 2,
                    duration: 40,
                    scale: 0.8 + Math.random() * 0.4
                }));
            }, i * 30);
        }
    }
    
    spawnGasterBlasterAimed() {
        const count = 5 + Math.floor(Math.random() * 3);
        const pattern = Math.random();
        
        for (let i = 0; i < count; i++) {
            let x, y;
            
            if (pattern < 0.33) {
                const side = Math.random() < 0.5 ? 0 : this.gameState.WIDTH;
                const yPos = 50 + Math.random() * (this.gameState.HEIGHT - 100);
                x = side;
                y = yPos;
            } else if (pattern < 0.66) {
                x = Math.random() * this.gameState.WIDTH;
                y = -50;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const distance = 150 + Math.random() * 150;
                x = this.gameState.player.pos.x + Math.cos(angle) * distance;
                y = this.gameState.player.pos.y + Math.sin(angle) * distance;
            }
            
            this.gameState.blasters.push(new GasterBlaster(x, y, this.gameState.player.pos.x, this.gameState.player.pos.y, {
                delay: 20 + i * 15,
                duration: 25 + Math.random() * 10,
                scale: 0.7 + Math.random() * 0.5
            }));
        }
    }
    
    spawnGasterBlasterCross() {
        const centerX = this.gameState.player.pos.x;
        const centerY = this.gameState.player.pos.y;
        const distance = 400;
        
        const positions = [
            [centerX - distance, centerY, centerX, centerY],
            [centerX + distance, centerY, centerX, centerY],
            [centerX, centerY - distance, centerX, centerY],
            [centerX, centerY + distance, centerX, centerY]
        ];
        
        positions.forEach(([x, y, tx, ty], i) => {
            setTimeout(() => {
                this.gameState.blasters.push(new GasterBlaster(x, y, tx, ty, {
                    delay: 20,
                    duration: 35,
                    scale: 1.0
                }));
            }, i * 100);
        });
    }
    
    spawnGasterBlasterSpiral() {
        const num = 9;
        const radius = 350;
        const centerX = this.gameState.WIDTH / 2;
        const centerY = this.gameState.HEIGHT / 3;
        
        for (let i = 0; i < num; i++) {
            const angle = (Math.PI * 2 / num) * i + this.gameState.fixedFrames * 0.02;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const targetAngle = angle + Math.PI + Math.sin(this.gameState.fixedFrames * 0.01) * 0.5;
            const tx = centerX + Math.cos(targetAngle) * 100;
            const ty = centerY + Math.sin(targetAngle) * 100;
            
            setTimeout(() => {
                this.gameState.blasters.push(new GasterBlaster(x, y, tx, ty, {
                    delay: i * 10,
                    duration: 30,
                    scale: 0.8 + Math.sin(i) * 0.2
                }));
            }, i * 50);
        }
    }
    
    spawnGasterBlasterRandomAim() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 250;

        let bx = this.gameState.player.pos.x + Math.cos(angle) * dist;
        let by = this.gameState.player.pos.y + Math.sin(angle) * dist;

        bx = Math.max(50, Math.min(this.gameState.WIDTH - 50, bx));
        by = Math.max(50, Math.min(this.gameState.HEIGHT - 150, by));

        this.gameState.blasters.push(new GasterBlaster(
            bx, by,
            this.gameState.player.pos.x, this.gameState.player.pos.y,
            {
                delay: 45,
                duration: 40,
                scale: 0.85,
                trackOnEnter: true
            }
        ));
    }

    spawnGasterBlasterSnapCircle() {
        const num = 14;
        const radius = 340;

        for (let i = 0; i < num; i++) {
            const angle = (Math.PI * 2 / num) * i;
            const bx = this.gameState.player.pos.x + Math.cos(angle) * radius;
            const by = this.gameState.player.pos.y + Math.sin(angle) * radius;

            this.gameState.blasters.push(new GasterBlaster(
                bx, by,
                this.gameState.player.pos.x, this.gameState.player.pos.y,
                {
                    delay: 50,
                    duration: 30,
                    scale: 1.1,
                    trackOnEnter: true
                }
            ));
        }
    }

    spawnGasterBlasterWallPressure() {
        const side = Math.random() < 0.5 ? 0 : this.gameState.WIDTH;
        const targetX = side === 0 ? this.gameState.WIDTH : 0;

        const y = Math.max(
            80,
            Math.min(this.gameState.HEIGHT - 80, this.gameState.player.pos.y + (Math.random() - 0.5) * 220)
        );

        this.gameState.blasters.push(new GasterBlaster(
            side, y,
            targetX, y,
            {
                delay: 30,
                duration: 18,
                scale: 0.75,
                trackOnEnter: true
            }
        ));
    }

    spawnGasterBlasterGiant() {
        this.gameState.blasters.push(new GasterBlaster(
            this.gameState.WIDTH / 2,
            90,
            this.gameState.WIDTH / 2,
            this.gameState.HEIGHT,
            {
                delay: 80,
                duration: 300,
                scale: 2.3,
                trackOnEnter: true
            }
        ));
    }
    
    spawnGasterDevourerPattern() {
        const patterns = [
            this.spawnGasterDevourersSingle.bind(this),
            this.spawnGasterDevourersPair.bind(this),
            this.spawnGasterDevourersWave.bind(this),
            this.spawnGasterDevourersFromBoss.bind(this)
        ];
        
        const patternIndex = Math.floor(Math.random() * patterns.length);
        patterns[patternIndex]();
    }
    
    spawnGasterDevourersSingle() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 220 + Math.random() * 120;
        const x = this.gameState.player.pos.x + Math.cos(angle) * dist;
        const y = this.gameState.player.pos.y + Math.sin(angle) * dist;

        this.gameState.gasterDevourers.push(new GasterDevourer(
            x, y,
            this.gameState.player.pos.x, this.gameState.player.pos.y,
            {
                scale: 0.8 + Math.random() * 0.4,
                aimTime: 40 + Math.random() * 20,
                dashSpeed: 18 + Math.random() * 6
            }
        ));
    }
    
    spawnGasterDevourersPair() {
        const baseAngle = Math.random() * Math.PI * 2;
        const offset = Math.PI / 6;

        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                const angle = baseAngle + (i === 0 ? -offset : offset);
                const dist = 240;

                const x = this.gameState.player.pos.x + Math.cos(angle) * dist;
                const y = this.gameState.player.pos.y + Math.sin(angle) * dist;

                this.gameState.gasterDevourers.push(new GasterDevourer(
                    x, y,
                    this.gameState.player.pos.x, this.gameState.player.pos.y,
                    {
                        scale: 0.7 + Math.random() * 0.3,
                        aimTime: 50 + Math.random() * 10,
                        dashSpeed: 13 + Math.random() * 4
                    }
                ));
            }, i * 200);
        }
    }
    
    spawnGasterDevourersWave() {
        const count = 3;
        const baseAngle = Math.random() * Math.PI * 2;
        const spread = Math.PI / 8;
        const dist = 260;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = baseAngle + (i - 1) * spread;

                const x = this.gameState.player.pos.x + Math.cos(angle) * dist;
                const y = this.gameState.player.pos.y + Math.sin(angle) * dist;

                this.gameState.gasterDevourers.push(new GasterDevourer(
                    x, y,
                    this.gameState.player.pos.x, this.gameState.player.pos.y,
                    {
                        scale: 0.6 + Math.random() * 0.2,
                        aimTime: 30 + Math.random() * 10,
                        dashSpeed: 16 + Math.random() * 4
                    }
                ));
            }, i * 150);
        }
    }
    
    spawnGasterDevourersFromBoss() {
        const count = 2;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 100;
                const x = this.pos.x + Math.cos(angle) * distance;
                const y = this.pos.y + Math.sin(angle) * distance;
                
                this.gameState.gasterDevourers.push(new GasterDevourer(
                    x, y,
                    this.gameState.player.pos.x, this.gameState.player.pos.y,
                    { 
                        scale: 0.9 + Math.random() * 0.3,
                        aimTime: 30,
                        dashSpeed: 10 + Math.random() * 4
                    }
                ));
            }, i * 100);
        }
    }

    spawnVortexPattern() {
        // Spinning vortex of devourers and blasters
        const count = 3;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 / count) * i;
                const dist = 200;
                const x = this.pos.x + Math.cos(angle) * dist;
                const y = this.pos.y + Math.sin(angle) * dist;

                this.gameState.gasterDevourers.push(new GasterDevourer(
                    x, y,
                    this.gameState.player.pos.x, this.gameState.player.pos.y,
                    {
                        scale: 1.2,
                        aimTime: 45,
                        dashSpeed: 12
                    }
                ));
            }, i * 200);
        }
    }

    spawnArcadePattern() {
        // Blasters forming an arcade pattern
        const count = 5;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 / count) * i;
                const dist = 150;
                const startX = this.pos.x + Math.cos(angle) * dist;
                const startY = this.pos.y + Math.sin(angle) * dist;

                this.gameState.blasters.push(new GasterBlaster(
                    startX, startY,
                    this.gameState.player.pos.x, this.gameState.player.pos.y,
                    {
                        delay: 20 + i * 10,
                        duration: 20,
                        scale: 0.6,
                        trackOnEnter: true
                    }
                ));
            }, i * 150);
        }
    }
    
    spawnUltimatePattern() {
        this.gameState.SHAKE_INTENSITY = 0;
        showStatus("CỰC KỲ NGUY HIỂM: TẤN CÔNG TỐI THƯỢNG!");
        
        this.spawnGasterBlasterCircle();
        
        setTimeout(() => {
            this.spawnGasterDevourersWave();
        }, 500);
        
        setTimeout(() => {
            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                this.gameState.bullets.push(getBulletFromPool(
                    this.pos.x, this.pos.y, angle, speed, 'boss',
                    { 
                        color: ['#ff0000', '#ff8800', '#ffff00'][Math.floor(Math.random() * 3)],
                        size: 4 + Math.random() * 3,
                        curve: (Math.random() - 0.5) * 0.02
                    }
                ));
            }
        }, 1000);
    }
    
    
    updateSpecialEntities() {
        // Update blasters
        for (let i = this.gameState.blasters.length - 1; i >= 0; i--) {
            if (!this.gameState.blasters[i].fixedUpdate()) {
                this.gameState.blasters.splice(i, 1);
            }
        }
        
        // Update devourers
        for (let i = this.gameState.gasterDevourers.length - 1; i >= 0; i--) {
            if (!this.gameState.gasterDevourers[i].fixedUpdate()) {
                this.gameState.gasterDevourers.splice(i, 1);
            }
        }
        
        if (this.gameState.blasters.length > CONFIG.performance.maxGasterBlasters) {
            this.gameState.blasters = this.gameState.blasters.slice(-CONFIG.performance.maxGasterBlasters);
        }
        if (this.gameState.gasterDevourers.length > CONFIG.performance.maxGasterDevourers) {
            this.gameState.gasterDevourers = this.gameState.gasterDevourers.slice(-CONFIG.performance.maxGasterDevourers);
        }
    }
    
    takeDamage(amount) {
        if (this.spellCompleted) return;
        
        amount *= 0.5;
        
        if (this.orbs.length > 0) {
            amount *= (0.9 - this.orbs.length * 0.1);
        }
        
        this.spellHp -= amount;
        
        if (Math.random() < 0.3 && this.gameState.items.length < CONFIG.performance.maxItems) {
            const itemCount = Math.min(3, 1 + Math.floor(this.gameState.player.power / 8));
            for (let i = 0; i < itemCount; i++) {
                this.gameState.items.push(getItemFromPool(
                    this.pos.x + (Math.random() - 0.5) * 40,
                    this.pos.y + (Math.random() - 0.5) * 40,
                    1 + Math.floor(this.gameState.player.power / 12)
                ));
            }
        }
        
        if (this.spellHp <= 0) {
            this.endSpell();
        }
    }
    
    endSpell() {
        this.spellCompleted = true;
        this.currentSpell++;
        
        createExplosion(this.pos.x, this.pos.y, 60, this.color);
        this.gameState.SHAKE_INTENSITY = 0;
        
        const timeBonus = Math.max(0, this.spellDuration - this.spellTimer);
        const spellBonus = Math.floor(timeBonus * this.gameState.SPELL_BONUS * 20 * (this.gameState.player.power / 4));
        addScore(spellBonus);
        
        showStatus(`SPELL CAPTURED! +${spellBonus.toLocaleString()} Points`);
        
        setTimeout(() => {
            this.spellHp = this.spellMaxHp;
            this.spellTimer = 0;
            this.spellCompleted = false;
            this.phase = 'normal';
            this.changePhase('normal');
            this.gameState.SPELL_BONUS += 0.15;
            
            CONFIG.boss.maxHpPerSpell *= 1.1;
            this.spellMaxHp = CONFIG.boss.maxHpPerSpell;
            this.spellHp = this.spellMaxHp;
        }, 2500);
    }
    
    draw(alpha) {
        const CTX = document.getElementById('gameCanvas').getContext('2d');
        const interpPos = this.pos.interpolated(alpha);
        
        // Draw orbs
        this.orbs.forEach(orb => {
            CTX.save();
            CTX.shadowBlur = 0;
            CTX.shadowColor = orb.color;
            CTX.fillStyle = orb.color;
            CTX.beginPath();
            CTX.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
            CTX.fill();
            CTX.restore();
        });
        
        // Draw boss
        CTX.save();
        
        let glowColor = this.color;
        if (this.phase === 'red') glowColor = '#ff0000';
        else if (this.phase === 'blue') glowColor = '#0088ff';
        else if (this.phase === 'purple') glowColor = '#aa00ff';
        else if (this.phase === 'yellow') glowColor = '#ffff00';
        else if (this.phase === 'rainbow') glowColor = '#ffffff';
        else if (this.phase === 'final') glowColor = '#ff0000';
        
        const visualGlow = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
        CTX.shadowBlur = 0 * visualGlow;
        CTX.shadowColor = glowColor;
        
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(interpPos.x, interpPos.y, this.radius, 0, Math.PI * 2);
        CTX.fill();
        
        CTX.fillStyle = 'white';
        CTX.beginPath();
        CTX.arc(interpPos.x, interpPos.y, 10, 0, Math.PI * 2);
        CTX.fill();
        
        CTX.restore();
        
        // Final phase aura
        if (this.phase === 'final') {
            CTX.save();
            CTX.globalAlpha = 0.3;
            CTX.strokeStyle = '#ff0000';
            CTX.lineWidth = 3;
            CTX.beginPath();
            CTX.arc(interpPos.x, interpPos.y, 50 + Math.sin(performance.now() * 0.001) * 10, 0, Math.PI * 2);
            CTX.stroke();
            CTX.restore();
        }
    }
}
