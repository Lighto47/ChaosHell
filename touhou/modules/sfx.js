// Sound Effects Module
// Manages all game audio

const SFX = {
    enabled: true,
    volume: 0.5,
    cache: {},
    
    // Initialize audio cache
    init() {
        this.sounds = {
            playerShoot: new Audio('../sfx/Flash.ogg'),
            playerBomb: new Audio('../sfx/bombsplosion.wav'),
            playerDamaged: new Audio('../sfx/PlayerDamaged.ogg'),
            playerDeath: new Audio('../sfx/lostlife.wav'),
            itemCollect: new Audio('../sfx/Ding.ogg'),
            bossPhaseChange: new Audio('../sfx/BossPhaseChange.ogg'),
            gasterBlasterEnter: new Audio('../sfx/GasterBlasterEnter.ogg'),
            gasterBlasterHold: new Audio('../sfx/GasterBlastHold.ogg'),
            gasterBlasterFire: new Audio('../sfx/GasterBlasterFire.ogg'),
            gasterDevourerSpawn: new Audio('../sfx/GasterDevourerSpawn.ogg'),
            gasterDevourerWarning: new Audio('../sfx/GasterDevourerWarning.ogg'),
            gasterDevourerDash: new Audio('../sfx/GasterDevourerDash.ogg'),
        };
        
        this.sounds.gasterBlasterHold.loop = true;
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    },
    
    // Play a sound effect
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            const sound = this.sounds[soundName];
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Silently ignore playback errors
            });
        } catch (e) {
            // Silently ignore errors
        }
    },
    
    // Stop a sound
    stop(soundName) {
        if (!this.sounds[soundName]) return;
        this.sounds[soundName].pause();
        this.sounds[soundName].currentTime = 0;
    },
    
    // Set volume (0-1)
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    },
    
    // Toggle audio on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
};

export default SFX;    // Game configuration settings