// Configuration for Touhou Danmaku Simulator
export const CONFIG = {
    // Colors
    colors: {
        boss: '#ff2222',
        bossGlow: '#aa0000',
        player: '#0021ffff',
        playerFocus: '#0a134a',
        bulletWhite: '#ffffff',
        bulletRed: '#ff0044',
        bulletBlue: '#0088ff',
        bulletPurple: '#aa00ff',
        bulletGreen: '#00ff00',
        bulletYellow: '#ffff00'
    },
    
    // Boss Stats (Enhanced)
    boss: {
        maxHpPerSpell: 260000,
        totalSpells: 16,
        spellDuration: 180 * 180,
        phases: ['normal', 'red', 'blue', 'purple', 'cyan', 'green', 'pink', 'white', 'yellow', 'gaster_only', 'rainbow', 'final']
    },
    
    // Player Stats (Enhanced for mobile)
    player: {
        startLives: 24,
        startBombs: 12,
        moveSpeed: 6,
        focusSpeed: 3.5,
        invulTime: 240,
        deathbombWindow: 24,
        
        // Enhanced power system
        powerMax: 9.00,
        powerStart: 1.00,
        powerLossOnDeath: 1.25,
        powerGainPerItem: 0.15,
        powerGainPerGraze: 0.01,
        
        // Graze system
        grazeDistance: 25,
        
        // Mobile-specific
        hitboxScale: 0.09,
        autoBombThreshold: 0.50,
        shakeToBomb: true
    },
    
    // Scoring (Enhanced)
    scoring: {
        grazePoints: 20,
        spellBonusBase: 20000,
        comboMultiplier: 150,
        pointItemValue: 50,
        powerBonusMultiplier: 1.5
    },
    
    // Performance
    performance: {
        maxBullets: 20000,
        maxParticles: 5000,
        bulletPoolSize: 20000,
        enableBulletPool: true,
        maxItems: 15,
        maxGasterBlasters: 10,
        maxGasterDevourers: 3
    },
    
    // Enhanced visual feedback
    visual: {
        particleIntensity: 1.2,
        screenShakeMultiplier: 1.3,
        hitFlashAlpha: 0.4,
        comboTextScale: 1.5,
        deathbombFlashIntensity: 0.6
    },
    
    // Sound config (placeholder for future audio)
    audio: {
        enableSounds: false,
        masterVolume: 0.7
    }
};

// Timing constants
export const LOGIC_FPS = 60;
export const FIXED_DT = 1000 / LOGIC_FPS;
