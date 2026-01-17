// Event handlers for the game
import { CONFIG } from './config.js';

export function setupEventListeners(gameState) {
    const CANVAS = document.getElementById('gameCanvas');
    const moveArea = document.getElementById('move-area');
    const focusBtn = document.getElementById('btn-focus');
    const bombBtn = document.getElementById('btn-bomb');
    
    moveArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.IS_TOUCHING = true;
        gameState.MULTI_TOUCH = e.touches.length > 1;
        
        const touch = e.touches[0];
        const rect = CANVAS.getBoundingClientRect();
        gameState.TOUCH_POS.x = touch.clientX - rect.left;
        gameState.TOUCH_POS.y = touch.clientY - rect.top;
        
        gameState.player.moveTarget.set(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
        createTouchFeedback(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
        
        gameState.LAST_TOUCH_TIME = Date.now();
    }, { passive: false });
    
    moveArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameState.IS_TOUCHING) return;
        
        gameState.MULTI_TOUCH = e.touches.length > 1;
        const touch = e.touches[0];
        const rect = CANVAS.getBoundingClientRect();
        gameState.TOUCH_POS.x = touch.clientX - rect.left;
        gameState.TOUCH_POS.y = touch.clientY - rect.top;
        
        gameState.player.moveTarget.set(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
    }, { passive: false });
    
    moveArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.IS_TOUCHING = false;
        gameState.MULTI_TOUCH = e.touches.length > 1;
    }, { passive: false });
    
    focusBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        focusBtn.classList.add('active');
    }, { passive: false });
    
    focusBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    bombBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameState.BOMB_COOLDOWN === 0 && gameState.player.bombs > 0) {
            gameState.player.useBomb();
            bombBtn.style.transform = 'scale(0.9)';
        }
    }, { passive: false });
    
    bombBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bombBtn.style.transform = 'scale(1)';
    }, { passive: false });
    
    moveArea.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        gameState.IS_TOUCHING = true;
        const rect = CANVAS.getBoundingClientRect();
        gameState.TOUCH_POS.x = e.clientX - rect.left;
        gameState.TOUCH_POS.y = e.clientY - rect.top;
        gameState.player.moveTarget.set(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
        createTouchFeedback(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
    });
    
    moveArea.addEventListener('mousemove', (e) => {
        if (!gameState.IS_TOUCHING) return;
        const rect = CANVAS.getBoundingClientRect();
        gameState.TOUCH_POS.x = e.clientX - rect.left;
        gameState.TOUCH_POS.y = e.clientY - rect.top;
        gameState.player.moveTarget.set(gameState.TOUCH_POS.x, gameState.TOUCH_POS.y);
    });
    
    moveArea.addEventListener('mouseup', () => {
        gameState.IS_TOUCHING = false;
    });
    
    moveArea.addEventListener('mouseleave', () => {
        gameState.IS_TOUCHING = false;
    });
    
    window.addEventListener('keydown', (e) => {
        if (!gameState.GAME_RUNNING) return;
        
        switch(e.key.toLowerCase()) {
            case 'f':
                focusBtn.classList.toggle('active');
                break;
            case 'b':
            case ' ':
                if (gameState.player.bombs > 0) gameState.player.useBomb();
                break;
        }
    });
    
    // Device motion for shake-to-bomb
    if (CONFIG.player.shakeToBomb && 'DeviceMotionEvent' in window) {
        let lastShakeTime = 0;
        let lastAcceleration = { x: 0, y: 0, z: 0 };
        
        window.addEventListener('devicemotion', (e) => {
            if (!gameState.GAME_RUNNING || gameState.player.bombs === 0 || gameState.BOMB_COOLDOWN > 0) return;
            
            const acceleration = e.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const currentTime = Date.now();
            const timeDiff = currentTime - lastShakeTime;
            
            if (timeDiff > 1000) {
                const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
                const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
                const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);
                
                if (deltaX + deltaY + deltaZ > 30) {
                    lastShakeTime = currentTime;
                    gameState.player.useBomb();
                }
            }
            
            lastAcceleration = {
                x: acceleration.x,
                y: acceleration.y,
                z: acceleration.z
            };
        });
    }
}

function createTouchFeedback(x, y) {
    const feedback = document.getElementById('touch-feedback');
    feedback.style.left = x + 'px';
    feedback.style.top = y + 'px';
    feedback.className = 'touch-feedback';
    
    setTimeout(() => {
        feedback.className = '';
    }, 300);
}
