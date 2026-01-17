// Object pooling system for performance optimization
import { CONFIG } from './config.js';
import { Bullet, PointItem, Particle } from './entities.js';

let bulletPool = [];
let itemPool = [];
let particlePool = [];

export function initBulletPool() {
    if (CONFIG.performance.enableBulletPool) {
        bulletPool = [];
        for (let i = 0; i < CONFIG.performance.bulletPoolSize; i++) {
            bulletPool.push(new Bullet(0, 0, 0, 0, 'pool', {}));
        }
        
        itemPool = [];
        for (let i = 0; i < 50; i++) {
            itemPool.push(new PointItem(0, 0, 1));
        }
        
        particlePool = [];
        for (let i = 0; i < 200; i++) {
            particlePool.push(new Particle(0, 0, '#ffffff'));
        }
        
        window.particlePool = particlePool;
    }
}

export function getBulletFromPool(x, y, angle, speed, type, props) {
    if (CONFIG.performance.enableBulletPool && bulletPool.length > 0) {
        const bullet = bulletPool.pop();
        bullet.reset(x, y, angle, speed, type, props);
        return bullet;
    }
    return new Bullet(x, y, angle, speed, type, props);
}

export function returnBulletToPool(bullet) {
    if (CONFIG.performance.enableBulletPool && bulletPool.length < CONFIG.performance.bulletPoolSize) {
        bullet.active = false;
        bulletPool.push(bullet);
    }
}

export function getItemFromPool(x, y, value) {
    if (CONFIG.performance.enableBulletPool && itemPool.length > 0) {
        const item = itemPool.pop();
        item.reset(x, y, value);
        return item;
    }
    return new PointItem(x, y, value);
}

export function returnItemToPool(item) {
    if (CONFIG.performance.enableBulletPool && itemPool.length < 50) {
        item.active = false;
        item.collected = false;
        itemPool.push(item);
    }
}

export function getParticleFromPool(x, y, color) {
    if (CONFIG.performance.enableBulletPool && particlePool.length > 0) {
        const particle = particlePool.pop();
        particle.reset(x, y, color);
        return particle;
    }
    return new Particle(x, y, color);
}
