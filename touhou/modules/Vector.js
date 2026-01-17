// Vector class with interpolation support
export class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
        this.prevX = x || 0;
        this.prevY = y || 0;
    }
    
    set(x, y) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x = x;
        this.y = y;
        return this;
    }
    
    add(v) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    
    sub(v) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    
    mult(n) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x *= n;
        this.y *= n;
        return this;
    }
    
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    magSq() {
        return this.x * this.x + this.y * this.y;
    }
    
    normalize() {
        const m = this.mag();
        if (m !== 0) this.mult(1 / m);
        return this;
    }
    
    limit(max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
        return this;
    }
    
    dist(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }
    
    copy() {
        return new Vector(this.x, this.y);
    }
    
    // For interpolation
    interpolated(alpha) {
        return {
            x: this.prevX + (this.x - this.prevX) * alpha,
            y: this.prevY + (this.y - this.prevY) * alpha
        };
    }
    
    // Fixed update - save previous
    fixedUpdate() {
        this.prevX = this.x;
        this.prevY = this.y;
    }
}
