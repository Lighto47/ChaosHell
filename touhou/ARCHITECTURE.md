# Complete Module Architecture Overview

## Project Structure

```
touhou/
│
├── v1.2 (fixedFrame)(backup).html          [HTML entry point]
│   └── imports → modules/main.js
│
├── modules/
│   ├── main.js                             [Core game loop & state]
│   │   └── imports from all other modules
│   │
│   ├── config.js                           [⚙️ Configuration]
│   │   └── CONFIG object, timing constants
│   │
│   ├── Vector.js                           [📐 Math Utilities]
│   │   └── Vector class with interpolation
│   │
│   ├── entities.js                         [🎮 Core Entities]
│   │   ├── Bullet class
│   │   ├── PointItem class
│   │   ├── Particle class
│   │   └── ParticleEffect static utility
│   │
│   ├── pools.js                            [♻️ Object Pooling]
│   │   ├── getBulletFromPool()
│   │   ├── getItemFromPool()
│   │   └── getParticleFromPool()
│   │
│   ├── Player.js                           [👤 Player Character] ⭐
│   │   ├── Movement & Focus mode
│   │   ├── Weapon system
│   │   ├── Bombs & Deathbomb
│   │   ├── Graze system
│   │   ├── Auto-bomb detection
│   │   └── 450+ lines of complete code
│   │
│   ├── Boss.js                             [👹 Boss Enemy] ⭐
│   │   ├── 8-phase spell system
│   │   ├── Orb-based attacks
│   │   ├── Pattern generators
│   │   ├── Phase transitions
│   │   └── 400+ lines of complete code
│   │
│   ├── SpecialAttacks.js                   [⚡ Special Effects]
│   │   ├── GasterBlaster class
│   │   └── GasterDevourer class
│   │
│   └── events.js                           [🎯 Event Handlers]
│       ├── Touch controls
│       ├── Mouse controls
│       ├── Keyboard controls
│       └── Device motion (shake-to-bomb)
│
├── MODULES.md                              [📖 Module Documentation]
├── ES6_CONVERSION_SUMMARY.md               [📋 Conversion Details]
└── SEPARATION_SUMMARY.md                   [🔀 Separation Details]
```

## Module Responsibilities

### 🎮 Core Game (main.js)
- Game state management
- Game loop (fixed update + variable render)
- Scene transitions (start/end)
- UI updates

### ⚙️ Configuration (config.js)
- Game constants
- Color palette
- Boss/Player stats
- Scoring rules
- Performance settings

### 📐 Math (Vector.js)
- Vector operations
- Position/velocity tracking
- Interpolation for smooth rendering

### 🎮 Entities (entities.js)
- Bullet mechanics
- Item drops
- Particle effects
- Visual effect generation

### ♻️ Performance (pools.js)
- Object reuse
- Memory management
- Garbage collection optimization

### 👤 Player (Player.js)
- Character state
- Input handling (movement target)
- Weapon firing
- Collision detection
- Power-ups and bonuses

### 👹 Boss (Boss.js)
- Enemy state
- AI patterns
- Spell management
- Health and scoring

### ⚡ Attacks (SpecialAttacks.js)
- Gaster Blaster beam attacks
- Gaster Devourer pursuit attacks
- Special effect animations

### 🎯 Input (events.js)
- Touch/mouse/keyboard input
- Device motion
- Button interactions
- Focus mode toggle

## Data Flow

```
User Input (events.js)
    ↓
Game State (gameState in main.js)
    ↓
Fixed Update @ 60FPS
├─ Player.fixedUpdate()
│  ├─ Movement
│  ├─ Attack
│  └─ Auto-bomb check
├─ Boss.fixedUpdate()
│  ├─ Movement
│  ├─ Pattern firing
│  └─ Special attacks
├─ Bullets.fixedUpdate()
│  ├─ Movement
│  ├─ Collision check
│  └─ Graze detection
└─ Items.fixedUpdate()
   ├─ Movement
   └─ Auto-collect check
    ↓
Render @ Monitor FPS
├─ Interpolate positions
├─ Draw all entities
└─ Update visual effects
```

## Class Hierarchy

```
main.js
├── gameState = {
│   ├── player: Player instance
│   ├── boss: Boss instance
│   ├── bullets: Bullet[]
│   ├── items: PointItem[]
│   ├── particles: Particle[]
│   ├── blasters: GasterBlaster[]
│   ├── gasterDevourers: GasterDevourer[]
│   └── [state variables]
│}
│
├── Player extends nothing (but uses Vector)
│   ├── pos: Vector
│   ├── moveTarget: Vector
│   ├── velocity: Vector
│   └── [player state]
│
├── Boss extends nothing (but uses Vector)
│   ├── pos: Vector
│   ├── [boss state]
│   └── orbs: [{angle, distance, color, x, y}]
│
└── Entities
    ├── Bullet extends nothing (but uses Vector)
    ├── PointItem extends nothing (but uses Vector)
    └── Particle extends nothing (but uses Vector)
```

## Key Imports

### main.js imports:
```javascript
import { CONFIG, LOGIC_FPS, FIXED_DT } from './config.js'
import { Vector } from './Vector.js'
import { Bullet, PointItem, Particle, ParticleEffect, ... } from './entities.js'
import { initBulletPool, getBulletFromPool, ... } from './pools.js'
import { Player } from './Player.js'              // ⭐ Individual
import { Boss } from './Boss.js'                  // ⭐ Individual
import { GasterBlaster, GasterDevourer } from './SpecialAttacks.js'
import { setupEventListeners } from './events.js'
```

### Player.js imports:
```javascript
import { CONFIG } from './config.js'
import { Vector } from './Vector.js'
import { getBulletFromPool } from './pools.js'
import { ParticleEffect } from './entities.js'
```

### Boss.js imports:
```javascript
import { CONFIG } from './config.js'
import { Vector } from './Vector.js'
import { getBulletFromPool, returnBulletToPool } from './pools.js'
import { getItemFromPool, returnItemToPool } from './pools.js'
import { ParticleEffect } from './entities.js'
```

## Timing Architecture

```
Browser Request Animation Frame (variable)
    ↓
Main Game Loop
├─ Accumulate delta time
├─ While accumulator >= FIXED_DT:
│  └─ fixedUpdate() @ 60FPS
│     (Deterministic game logic)
├─ Calculate alpha = accumulator / FIXED_DT
└─ render(alpha)
   └─ Interpolate all positions using alpha
      (Smooth animation regardless of FPS)
    ↓
updateParticles(delta) 
└─ Visual-only effects use delta time
   (Particles, screen shake)
```

## Performance Optimizations

1. **Object Pooling** (pools.js)
   - Reuse Bullet, Item, Particle objects
   - Reduce GC pauses
   - Pre-allocate pools at startup

2. **Hybrid Timing**
   - Fixed 60 FPS physics
   - Variable rendering with interpolation
   - Decouples gameplay from frame rate

3. **Entity Limits**
   - Max bullets: 20,000
   - Max particles: 5,000
   - Max items: 15
   - Auto-culling when exceeded

4. **Performance Monitoring**
   - Real-time FPS counter
   - Entity count display
   - Performance warnings

## Testing Checklist

- [ ] Player movement with mouse
- [ ] Player movement with touch
- [ ] Focus mode toggle
- [ ] Bomb mechanics
- [ ] Deathbomb window
- [ ] Graze detection
- [ ] Power system scaling
- [ ] Boss phase transitions
- [ ] Orb attacks
- [ ] Bullet collision
- [ ] Auto-bomb activation
- [ ] Score and combo system
- [ ] Mobile responsiveness
- [ ] Performance at 20K bullets
- [ ] Spell card timers

## Future Enhancements

- [ ] Sound effects and music
- [ ] Particle system improvements
- [ ] Network multiplayer
- [ ] Replay system
- [ ] Custom spell editor
- [ ] Difficulty settings
- [ ] Leaderboard system
- [ ] Game controller support
