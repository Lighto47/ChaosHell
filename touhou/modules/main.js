// Main game module entry point
// This file orchestrates all game imports and initialization

import { CONFIG, LOGIC_FPS, FIXED_DT } from './config.js';
import { Vector } from './Vector.js';
import { 
    Bullet, 
    PointItem, 
    Particle, 
    ParticleEffect,
    setGameContext,
    setGameState,
    returnParticleToPool 
} from './entities.js';
import { 
    initBulletPool, 
    getBulletFromPool, 
    returnBulletToPool,
    getItemFromPool, 
    returnItemToPool, 
    getParticleFromPool 
} from './pools.js';
import { Player } from './Player.js';
import { Boss } from './Boss.js';
import { 
    GasterBlaster,
    GasterDevourer,
    setGameStateRef
} from './SpecialAttacks.js';
import { 
    setupEventListeners 
} from './events.js';
import SFX from './sfx.js';
import VFX from './vfx.js';

// Game state
export const gameState = {
    WIDTH: 0,
    HEIGHT: 0,
    GAME_RUNNING: false,
    SHAKE_INTENSITY: 0,
    IS_TOUCHING: false,
    TOUCH_POS: { x: 0, y: 0 },
    LAST_TOUCH_TIME: 0,
    FOCUS_ACTIVE: false,
    BOMB_COOLDOWN: 0,
    AUTO_BOMB_ACTIVE: false,
    MULTI_TOUCH: false,
    
    // Scoring
    SCORE: 0,
    GRAZE_COUNT: 0,
    COMBO_COUNT: 0,
    COMBO_TIMER: 0,
    POINT_ITEMS: 0,
    SPELL_BONUS: 1.0,
    
    // Performance tracking
    LAST_FPS_UPDATE: 0,
    FPS: 60,
    BULLET_COUNT: 0,
    PARTICLE_COUNT: 0,
    
    // Game entities
    player: null,
    boss: null,
    bullets: [],
    particles: [],
    items: [],
    blasters: [],
    gasterDevourers: [],
    
    // Timing
    accumulator: 0,
    lastTime: 0,
    alpha: 0,
    fixedFrames: 0
};

// Get canvas
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d', { alpha: false });

// Set context for modules
setGameContext(CTX);

// Hybrid timing variables
let accumulator = 0;
let lastTime = 0;
let alpha = 0;
let fixedFrames = 0;

/**
 * Resize handler
 */
function resize() {
    gameState.WIDTH = window.innerWidth;
    gameState.HEIGHT = window.innerHeight;
    
    CANVAS.width = gameState.WIDTH;
    CANVAS.height = gameState.HEIGHT;
    
    const isSmallScreen = gameState.WIDTH < 400 || gameState.HEIGHT < 600;
    if (isSmallScreen) {
        document.querySelector('.spell-container').style.top = '70px';
        document.querySelector('.spell-name').style.fontSize = '14px';
        document.querySelector('.touch-btn').style.width = '60px';
        document.querySelector('.touch-btn').style.height = '60px';
    }
}

/**
 * Initialize game
 */
function init() {
    resize();
    
    // Initialize sound effects and visual effects
    SFX.init();
    VFX.init(CANVAS);
    
    initBulletPool();
    
    gameState.player = new Player(gameState);
    gameState.boss = new Boss(gameState);
    
    gameState.bullets = [];
    gameState.particles = [];
    gameState.items = [];
    gameState.blasters = [];
    gameState.gasterDevourers = [];
    
    gameState.SCORE = 0;
    gameState.GRAZE_COUNT = 0;
    gameState.COMBO_COUNT = 0;
    gameState.COMBO_TIMER = 0;
    gameState.POINT_ITEMS = 0;
    gameState.SPELL_BONUS = 1.0;
    gameState.fixedFrames = 0;
    gameState.GAME_RUNNING = true;
    
    // Sync gameState with entities module
    setGameState(gameState);
    
    // Sync gameState with SpecialAttacks module
    setGameStateRef(gameState);
    
    CONFIG.boss.maxHpPerSpell = 150000;
    
    accumulator = 0;
    lastTime = 0;
    alpha = 0;
    fixedFrames = 0;
    
    updateUI();
    updateSpellUI();
}

/**
 * Fixed update (60 FPS logic)
 */
function fixedUpdate() {
    if (!gameState.GAME_RUNNING) return;
    
    fixedFrames++;
    gameState.fixedFrames = fixedFrames;
    
    // Sync gameState with entities module every frame
    setGameState(gameState);
    
    gameState.SHAKE_INTENSITY = Math.max(0, gameState.SHAKE_INTENSITY - 0.85);
    gameState.BOMB_COOLDOWN = Math.max(0, gameState.BOMB_COOLDOWN - 1);
    
    gameState.boss.fixedUpdate();
    gameState.player.fixedUpdate();
    
    // Update bullets
    gameState.BULLET_COUNT = 0;
    const playerHitRadiusSq = gameState.player.hitboxRadius * gameState.player.hitboxRadius;
    const bossRadiusSq = gameState.boss.radius * gameState.boss.radius;
    
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        if (!bullet.fixedUpdate()) {
            returnBulletToPool(bullet);
            gameState.bullets.splice(i, 1);
            continue;
        }
        gameState.BULLET_COUNT++;
        
        // Player bullet hitting boss
        if (bullet.type === 'player' && !gameState.player.bombActive) {
            const dx = bullet.pos.x - gameState.boss.pos.x;
            const dy = bullet.pos.y - gameState.boss.pos.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < bossRadiusSq + bullet.radius * bullet.radius) {
                const damage = 100 * (1 + gameState.player.power / 8);
                gameState.boss.takeDamage(damage);
                createExplosion(bullet.pos.x, bullet.pos.y, 2.5, bullet.color);
                ParticleEffect.createBurst(bullet.pos.x, bullet.pos.y, 6, bullet.color, 2);
                gameState.SHAKE_INTENSITY = Math.max(gameState.SHAKE_INTENSITY, 2);
                gameState.COMBO_TIMER = 180;
                continue;
            }
        }
        
        // Boss bullet hitting player
        if (bullet.type === 'boss' && fixedFrames - bullet.spawnFrame > 3 && 
            !bullet.hasHitPlayer && gameState.player.invulFrames <= 0 && !gameState.player.bombActive) {
            const dx = bullet.pos.x - gameState.player.pos.x;
            const dy = bullet.pos.y - gameState.player.pos.y;
            const distSq = dx * dx + dy * dy;
            const collisionDist = gameState.player.hitboxRadius + bullet.radius;
            const collisionDistSq = collisionDist * collisionDist;
            
            if (distSq < collisionDistSq) {
                gameState.player.onHit();
                ParticleEffect.createBurst(gameState.player.pos.x, gameState.player.pos.y, 10, '#ff4444', 4);
                gameState.SHAKE_INTENSITY = Math.max(gameState.SHAKE_INTENSITY, 8);
                bullet.hasHitPlayer = true;
                createExplosion(bullet.pos.x, bullet.pos.y, 3, bullet.color);
                returnBulletToPool(bullet);
                gameState.bullets.splice(i, 1);
                continue;
            }
        }
    }
    
    // Update items
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        if (!gameState.items[i].fixedUpdate()) {
            returnItemToPool(gameState.items[i]);
            gameState.items.splice(i, 1);
        }
    }
    
    // Update combo
    if (gameState.COMBO_TIMER > 0) {
        gameState.COMBO_TIMER--;
    } else if (gameState.COMBO_COUNT > 0) {
        gameState.COMBO_COUNT = 0;
    }
    
    // Enforce limits
    if (gameState.bullets.length > CONFIG.performance.maxBullets) {
        const toRemove = gameState.bullets.length - CONFIG.performance.maxBullets;
        for (let i = 0; i < toRemove; i++) {
            returnBulletToPool(gameState.bullets[i]);
        }
        gameState.bullets = gameState.bullets.slice(toRemove);
    }
    
    if (gameState.items.length > CONFIG.performance.maxItems) {
        const toRemove = gameState.items.length - CONFIG.performance.maxItems;
        for (let i = 0; i < toRemove; i++) {
            returnItemToPool(gameState.items[i]);
        }
        gameState.items = gameState.items.slice(toRemove);
    }
    
    // Update UI periodically
    if (fixedFrames % 15 === 0) {
        updateUI();
        updateSpellUI();
    }
    
    gameState.SHAKE_INTENSITY = Math.max(0, gameState.SHAKE_INTENSITY - 1);
}

/**
 * Update particles
 */
function updateParticles(deltaFactor) {
    gameState.PARTICLE_COUNT = 0;
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        if (!gameState.particles[i].updateVisual(deltaFactor)) {
            returnParticleToPool(gameState.particles[i]);
            gameState.particles.splice(i, 1);
            continue;
        }
        gameState.PARTICLE_COUNT++;
    }
    
    if (gameState.particles.length > CONFIG.performance.maxParticles) {
        const toRemove = gameState.particles.length - CONFIG.performance.maxParticles;
        for (let i = 0; i < toRemove; i++) {
            returnParticleToPool(gameState.particles[i]);
        }
        gameState.particles = gameState.particles.slice(toRemove);
    }
}

/**
 * Render frame
 */
function render(alpha) {
    CTX.fillStyle = '#050505';
    CTX.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
    
    if (gameState.SHAKE_INTENSITY > 0) {
        CTX.save();
        const shakeAmount = gameState.SHAKE_INTENSITY * CONFIG.visual.screenShakeMultiplier;
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        CTX.translate(dx, dy);
    }
    
    if (gameState.player.hitThisFrame && gameState.GAME_RUNNING) {
        CTX.save();
        CTX.globalAlpha = CONFIG.visual.hitFlashAlpha;
        CTX.fillStyle = '#ff4444';
        CTX.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
        CTX.restore();
    }
    
    gameState.boss.draw(alpha);
    gameState.bullets.forEach(b => b.draw(alpha));
    gameState.items.forEach(i => i.draw(alpha));
    gameState.particles.forEach(p => p.draw(alpha));
    gameState.blasters.forEach(b => b.draw(alpha));
    gameState.gasterDevourers.forEach(d => d.draw(alpha));
    gameState.player.draw(alpha);
    
    // Draw VFX (floating texts and particles)
    VFX.drawFloatingTexts(CTX);
    VFX.drawParticles(CTX);
    
    // Draw combo text
    if (gameState.COMBO_COUNT > 0 && gameState.COMBO_TIMER > 0) {
        CTX.save();
        CTX.font = `bold ${24 * CONFIG.visual.comboTextScale}px Arial`;
        CTX.fillStyle = `rgba(255, 150, 0, ${gameState.COMBO_TIMER / 180})`;
        CTX.textAlign = 'center';
        CTX.textBaseline = 'middle';
        const scale = 1 + (1 - gameState.COMBO_TIMER / 180) * 0.3;
        CTX.globalAlpha = gameState.COMBO_TIMER / 180;
        CTX.transform(scale, 0, 0, scale, gameState.WIDTH / 2, gameState.HEIGHT * 0.3);
        CTX.fillText(`COMBO x${gameState.COMBO_COUNT}`, 0, 0);
        CTX.restore();
    }
    
    if (gameState.SHAKE_INTENSITY > 0) {
        CTX.restore();
    }
    
    // Update HUD glow effects
    VFX.updateHUDGlow();
    
    monitorPerformance();
}

/**
 * Main game loop
 */
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    let delta = timestamp - lastTime;
    lastTime = timestamp;
    
    if (delta > 250) delta = 250;
    
    accumulator += delta;
    
    while (accumulator >= FIXED_DT) {
        fixedUpdate();
        accumulator -= FIXED_DT;
    }
    
    alpha = accumulator / FIXED_DT;
    
    render(alpha);
    updateParticles(delta / 16.67);
    
    requestAnimationFrame(gameLoop);
}

/**
 * Start game
 */
export function startGame() {
    document.getElementById('overlay').classList.add('hidden');
    
    gameState.IS_TOUCHING = false;
    gameState.MULTI_TOUCH = false;
    
    init();
    requestAnimationFrame(gameLoop);
}

/**
 * End game
 */
export function endGame(win) {
    gameState.GAME_RUNNING = false;
    
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    
    const title = overlay.querySelector('h1');
    const subtitle = overlay.querySelector('.subtitle');
    
    if (win) {
        title.innerText = "VICTORY!";
        title.style.color = "gold";
        subtitle.innerHTML = `
            <b>Spell Cards Captured: ${gameState.boss.currentSpell-1}</b><br>
            Final Score: ${gameState.SCORE.toLocaleString()}<br>
            Max Power: ${gameState.player.power.toFixed(2)}<br>
            Graze: ${gameState.player.grazeCount}
        `;
    } else {
        title.innerText = "GAME OVER";
        title.style.color = "red";
        subtitle.innerHTML = `
            <b>Reached Spell: ${gameState.boss.currentSpell}</b><br>
            Final Score: ${gameState.SCORE.toLocaleString()}<br>
            Max Power: ${gameState.player.power.toFixed(2)}<br>
            Graze: ${gameState.player.grazeCount}
        `;
    }
}

/**
 * Update UI
 */
function updateUI() {
    document.getElementById('score-value').innerText = gameState.SCORE.toLocaleString();
    
    const comboText = gameState.COMBO_COUNT > 0 
        ? `Combo: ${gameState.COMBO_COUNT} x${(1 + gameState.COMBO_COUNT * 0.02).toFixed(2)}` 
        : 'Combo: 0';
    document.getElementById('combo-value').innerText = comboText;
    
    if (gameState.player) {
        gameState.player.updateUI();
    }
}

/**
 * Update spell UI
 */
function updateSpellUI() {
    if (!gameState.boss) return;
    
    const hpPct = (gameState.boss.spellHp / gameState.boss.spellMaxHp) * 100;
    document.getElementById('spell-hp-bar').style.width = hpPct + "%";
    document.getElementById('spell-hp-val').innerText = Math.floor(gameState.boss.spellHp).toLocaleString();
    document.getElementById('spell-hp-max').innerText = Math.floor(gameState.boss.spellMaxHp).toLocaleString();
    document.getElementById('spell-name').innerText = gameState.boss.spellName;
    document.getElementById('spell-stack').innerText = `No. ${gameState.boss.currentSpell}`;
    
    const timeLeft = Math.max(0, (gameState.boss.spellDuration - gameState.boss.spellTimer) / 60);
    document.getElementById('spell-timer').innerText = `Time: ${timeLeft.toFixed(2)}`;
    
    const spellPct = (gameState.boss.spellTimer / gameState.boss.spellDuration) * 100;
    document.getElementById('spell-indicator').style.width = spellPct + "%";
}

/**
 * Create explosion effect
 */
export function createExplosion(x, y, count, color) {
    const actualCount = Math.min(count * CONFIG.visual.particleIntensity, 20);
    for (let i = 0; i < actualCount; i++) {
        const angle = (i / actualCount) * Math.PI * 2;
        const particle = getParticleFromPool(x, y, color);
        const speed = 2 + Math.random() * 2;
        particle.vel.set(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        gameState.particles.push(particle);
    }
    
    // Add VFX burst effect
    VFX.createBurst(x, y, 12, color);
}

/**
 * Show status message
 */
export function showStatus(text) {
    const el = document.getElementById('spell-status');
    el.innerText = text;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 2000);
}

/**
 * Add score
 */
export function addScore(amount) {
    const comboBonus = 1 + (gameState.COMBO_COUNT * 0.02);
    const powerBonus = 1 + (gameState.player.power * CONFIG.scoring.powerBonusMultiplier / 24);
    gameState.SCORE += Math.floor(amount * comboBonus * powerBonus * gameState.SPELL_BONUS);
}

/**
 * Monitor performance
 */
function monitorPerformance() {
    const now = performance.now();
    if (now - gameState.LAST_FPS_UPDATE > 1000) {
        gameState.FPS = Math.round(1000 / (now - gameState.LAST_FPS_UPDATE));
        gameState.LAST_FPS_UPDATE = now;
        
        const warning = document.getElementById('performance-warning');
        if (gameState.FPS < 45) {
            warning.innerText = `PERF: ${gameState.FPS}FPS (${gameState.BULLET_COUNT} bullets, ${gameState.items.length} items)`;
            warning.style.opacity = '1';
        } else if (gameState.FPS < 55) {
            warning.innerText = `${gameState.FPS}FPS`;
            warning.style.opacity = '0.5';
        } else {
            warning.style.opacity = '0';
        }
    }
}

// Setup event listeners
setupEventListeners(gameState);

// Window event listeners
window.addEventListener('resize', resize);
window.addEventListener('load', () => {
    resize();
    if (typeof GasterDevourer !== 'undefined') {
        GasterDevourer._prepareSprite();
    }
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
});

// Make startGame available globally for HTML onclick
window.startGame = startGame;
