// game.js - Cosmic Vanguard Main Game Engine
import sound from './sound.js';

// Setup Canvas and Context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game State Object
const state = {
    screen: 'start', // 'start', 'playing', 'paused', 'shop', 'gameover'
    score: 0,
    coinsCollected: 0,
    totalCoins: parseInt(localStorage.getItem('cosmic_stardust')) || 0,
    bossesDefeated: 0,
    activeShip: 'phoenix',
    keys: {},
    mouse: { x: 0, y: 0, isDown: false, active: false },
    viewportWidth: 0,
    viewportHeight: 0,
    
    // Upgrades level tracker (loaded from localStorage or defaults)
    upgrades: JSON.parse(localStorage.getItem('cosmic_upgrades')) || {
        maxHull: 1,
        shieldRecharge: 1,
        weaponPower: 1,
        fireRate: 1
    },

    // Config prices
    upgradeCosts: {
        maxHull: [100, 250, 500, 1000, null],
        shieldRecharge: [150, 300, 600, 1200, null],
        weaponPower: [200, 450, 800, 1600, null],
        fireRate: [200, 400, 850, 1800, null]
    }
};

// Ship Profiles & Base Statistics
const SHIP_PROFILES = {
    phoenix: {
        color: '#ff007f', // Neon Magenta
        glow: 'rgba(255, 0, 127, 0.6)',
        speed: 8,
        baseHealth: 80,
        baseShield: 60,
        shieldRegen: 0.05,
        fireCooldown: 180, // milliseconds
        ability: 'Rapid Fire Thrusters',
        draw: drawPhoenixShip
    },
    titan: {
        color: '#00f0ff', // Neon Cyan
        glow: 'rgba(0, 240, 255, 0.6)',
        speed: 4.5,
        baseHealth: 150,
        baseShield: 100,
        shieldRegen: 0.08,
        fireCooldown: 350,
        ability: 'Heavy Plasma Spread',
        draw: drawTitanShip
    },
    specter: {
        color: '#39ff14', // Acid Green
        glow: 'rgba(57, 255, 20, 0.6)',
        speed: 6.5,
        baseHealth: 100,
        baseShield: 80,
        shieldRegen: 0.06,
        fireCooldown: 240,
        ability: 'Phase Shield Generator',
        draw: drawSpecterShip
    }
};

// Setup Viewport Size
function resizeCanvas() {
    state.viewportWidth = window.innerWidth;
    state.viewportHeight = window.innerHeight;
    canvas.width = state.viewportWidth;
    canvas.height = state.viewportHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ================= INPUT LISTENERS =================
window.addEventListener('keydown', (e) => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' && state.screen === 'playing') {
        fireQuantumBomb();
    }
    if (e.key.toLowerCase() === 'p' && state.screen === 'playing') {
        togglePause();
    }
});
window.addEventListener('keyup', (e) => {
    state.keys[e.key.toLowerCase()] = false;
});

// Mouse/Touch controls
function updatePointerPos(x, y) {
    state.mouse.x = x;
    state.mouse.y = y;
}
canvas.addEventListener('mousemove', (e) => {
    state.mouse.active = true;
    updatePointerPos(e.clientX, e.clientY);
});
canvas.addEventListener('mousedown', (e) => {
    state.mouse.isDown = true;
    if (state.screen === 'playing' && e.button === 0) {
        // Player shoots automatically, but we can capture clicks if needed
    }
});
canvas.addEventListener('mouseup', () => {
    state.mouse.isDown = false;
});
canvas.addEventListener('mouseleave', () => {
    state.mouse.active = false;
    state.mouse.isDown = false;
});

// Touch controls for Mobile
canvas.addEventListener('touchstart', (e) => {
    state.mouse.active = true;
    state.mouse.isDown = true;
    updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
});
canvas.addEventListener('touchmove', (e) => {
    updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
});
canvas.addEventListener('touchend', () => {
    state.mouse.isDown = false;
});

// ================= GAME ENTITIES CLASS DEFINITIONS =================

// Particle Engine for visual juice
class Particle {
    constructor(x, y, color, size, vx, vy, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = life;
        this.life = life;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }
    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.size * 2;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Parallax Space Background Starfield
class Starfield {
    constructor() {
        this.stars = [];
        this.nebulaSeed = Math.random() * 1000;
        this.initStars();
    }

    initStars() {
        this.stars = [];
        // Layers: Slow background, medium, fast foreground
        for (let i = 0; i < 180; i++) {
            this.stars.push({
                x: Math.random() * state.viewportWidth,
                y: Math.random() * state.viewportHeight,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.05 + 0.01,
                layer: 1,
                color: '#ffffff'
            });
        }
        for (let i = 0; i < 80; i++) {
            const colors = ['#73f2ff', '#ffffff', '#ff94f0'];
            this.stars.push({
                x: Math.random() * state.viewportWidth,
                y: Math.random() * state.viewportHeight,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.12 + 0.06,
                layer: 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        for (let i = 0; i < 20; i++) {
            this.stars.push({
                x: Math.random() * state.viewportWidth,
                y: Math.random() * state.viewportHeight,
                size: Math.random() * 3 + 2,
                speed: Math.random() * 0.3 + 0.15,
                layer: 3,
                color: '#00f0ff'
            });
        }
    }

    update(dt) {
        this.stars.forEach(star => {
            star.y += star.speed * dt * 60;
            if (star.y > state.viewportHeight) {
                star.y = 0;
                star.x = Math.random() * state.viewportWidth;
            }
        });
    }

    draw(ctx) {
        // Draw space background nebula gradient
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, state.viewportHeight);
        spaceGrad.addColorStop(0, '#020208');
        spaceGrad.addColorStop(0.5, '#070514');
        spaceGrad.addColorStop(1, '#0e0824');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);

        // Simple glowing spatial gas dust clouds (nebula effect)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const nebulaGrad = ctx.createRadialGradient(
            state.viewportWidth * 0.7, state.viewportHeight * 0.3, 10,
            state.viewportWidth * 0.7, state.viewportHeight * 0.3, state.viewportWidth * 0.5
        );
        nebulaGrad.addColorStop(0, 'rgba(157, 0, 255, 0.08)');
        nebulaGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.03)');
        nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebulaGrad;
        ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);
        ctx.restore();

        // Draw Stars
        ctx.save();
        this.stars.forEach(star => {
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// Player Ship Representation
class Player {
    constructor(profileName) {
        this.profileName = profileName;
        this.profile = SHIP_PROFILES[profileName];
        
        // Load upgraded stats
        this.levelStats = getUpgradedPlayerStats(profileName);
        
        this.x = state.viewportWidth / 2;
        this.y = state.viewportHeight - 120;
        this.width = 54;
        this.height = 54;
        this.radius = 22; // collision radius
        
        this.health = this.levelStats.maxHull;
        this.maxHealth = this.levelStats.maxHull;
        this.shield = this.levelStats.maxShield;
        this.maxShield = this.levelStats.maxShield;
        this.shieldRecharge = this.levelStats.shieldRegen;

        this.speed = this.profile.speed;
        this.weaponPower = this.levelStats.weaponDamage;
        this.fireCooldown = this.levelStats.fireCooldown;
        this.lastFired = 0;

        // Weapon upgrades in run
        this.weaponUpgradeLevel = 1; // 1 = Single, 2 = Double, 3 = Triple
        this.weaponDuration = 0; // seconds remaining for multi-shot powerup

        this.invulnerableTime = 0;
        this.shieldActiveVisual = 0; // Trigger animated glow circle when taking shield hit
        
        // Quantum Bombs stock
        this.bombs = 2;
    }

    takeDamage(amount) {
        if (this.invulnerableTime > 0) return;

        state.screenShake = 12; // Shake screen on taking hit
        this.invulnerableTime = 0.8; // 800ms of frames

        if (this.shield > 0) {
            this.shieldActiveVisual = 0.5; // active shield glow
            this.shield -= amount;
            sound.playHit();
            if (this.shield < 0) {
                // overflow into hull
                this.health += this.shield;
                this.shield = 0;
                sound.playExplosion('small');
            }
        } else {
            this.health -= amount;
            sound.playExplosion('medium');
        }

        if (this.health <= 0) {
            this.health = 0;
            triggerGameOver();
        }
    }

    update(dt) {
        // Regenerate shield
        if (this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRecharge * dt * 60);
        }

        // Countdown timers
        if (this.invulnerableTime > 0) this.invulnerableTime -= dt;
        if (this.shieldActiveVisual > 0) this.shieldActiveVisual -= dt;
        if (this.weaponDuration > 0) {
            this.weaponDuration -= dt;
            if (this.weaponDuration <= 0) {
                this.weaponUpgradeLevel = 1;
                hudWeaponTypeName.innerText = "Standard Blaster";
                hudWeaponTypeName.style.color = "var(--neon-green)";
            }
        }

        // Movement limits
        const speedMultiplier = dt * 60;
        let dx = 0;
        let dy = 0;

        // Mouse/Touch Tracking
        if (state.mouse.active) {
            const targetX = state.mouse.x;
            const targetY = state.mouse.y;
            // Lerp towards cursor
            const lerpSpeed = 0.15 * speedMultiplier;
            this.x += (targetX - this.x) * lerpSpeed;
            this.y += (targetY - this.y) * lerpSpeed;
        } else {
            // Keyboard controls
            if (state.keys['a'] || state.keys['arrowleft']) dx -= this.speed;
            if (state.keys['d'] || state.keys['arrowright']) dx += this.speed;
            if (state.keys['w'] || state.keys['arrowup']) dy -= this.speed;
            if (state.keys['s'] || state.keys['arrowdown']) dy += this.speed;

            this.x += dx * speedMultiplier;
            this.y += dy * speedMultiplier;
        }

        // Clamp to screen boundaries
        this.x = Math.max(this.radius + 10, Math.min(state.viewportWidth - this.radius - 10, this.x));
        this.y = Math.max(this.radius + 10, Math.min(state.viewportHeight - this.radius - 20, this.y));

        // Automatic fire controls
        const now = Date.now();
        if (now - this.lastFired > this.fireCooldown) {
            this.shoot();
            this.lastFired = now;
        }

        // Emit light engine particles from back of the ship
        if (Math.random() < 0.4) {
            const offset = (Math.random() - 0.5) * 15;
            spawnParticles(this.x + offset, this.y + 20, 'rgba(255, 170, 0, 0.7)', 2, (Math.random() - 0.5) * 2, Math.random() * 3 + 2, 0.4);
        }
    }

    shoot() {
        const soundType = this.profileName === 'titan' ? 'heavy' : (this.profileName === 'phoenix' ? 'rapid' : 'default');
        sound.playLaser(soundType);

        const projectileSpeed = -14;
        const color = this.profile.color;

        if (this.weaponUpgradeLevel === 1) {
            // Single beam
            projectiles.push(new Projectile(this.x, this.y - 20, 0, projectileSpeed, color, this.weaponPower, true));
        } else if (this.weaponUpgradeLevel === 2) {
            // Double beams
            projectiles.push(new Projectile(this.x - 12, this.y - 10, 0, projectileSpeed, color, this.weaponPower, true));
            projectiles.push(new Projectile(this.x + 12, this.y - 10, 0, projectileSpeed, color, this.weaponPower, true));
        } else if (this.weaponUpgradeLevel >= 3) {
            // Triple spreading beams
            projectiles.push(new Projectile(this.x, this.y - 20, 0, projectileSpeed, color, this.weaponPower, true));
            projectiles.push(new Projectile(this.x - 18, this.y - 8, -2, projectileSpeed * 0.95, color, this.weaponPower, true));
            projectiles.push(new Projectile(this.x + 18, this.y - 8, 2, projectileSpeed * 0.95, color, this.weaponPower, true));
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Invulnerability flickering
        if (this.invulnerableTime > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.restore();
            return;
        }

        // Render Ship
        this.profile.draw(ctx, this.x, this.y, this.profile.color);

        // Draw active shield dome
        if (this.shield > 0) {
            const glowAmount = this.shieldActiveVisual > 0 ? this.shieldActiveVisual * 20 : 2;
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowBlur = glowAmount * 4;
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 1.5 + (this.shieldActiveVisual * 2);
            ctx.globalAlpha = 0.2 + (this.shieldActiveVisual * 0.5) + (this.shield / this.maxShield) * 0.25;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
}

// Laser Bullets
class Projectile {
    constructor(x, y, vx, vy, color, damage, isPlayerOwned) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.damage = damage;
        this.isPlayerOwned = isPlayerOwned;
        this.radius = isPlayerOwned ? 4 : 5;
    }
    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
    }
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if (this.isPlayerOwned) {
            // Draw player oval laser
            ctx.ellipse(this.x, this.y, 3, 10, 0, 0, Math.PI * 2);
        } else {
            // Enemy round plasma orb
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

// Enemy Fleet Classes
class Enemy {
    constructor(type) {
        this.type = type; // 'scout', 'fighter', 'meteor', 'elite'
        this.radius = 18;
        this.health = 10;
        this.scoreVal = 100;
        this.color = '#ff0055';
        this.vx = 0;
        this.vy = 2;
        this.lastShot = Date.now();
        this.shootInterval = 2000 + Math.random() * 2000;
        this.meteorSize = 0; // Only for meteor
        this.angle = 0;
        this.rotSpeed = 0;
        this.sineTimer = Math.random() * 100;

        this.x = Math.random() * (state.viewportWidth - 80) + 40;
        this.y = -50;

        this.initType(type);
    }

    initType(type) {
        switch (type) {
            case 'scout':
                this.radius = 16;
                this.health = 10 + Math.floor(state.score / 2000);
                this.scoreVal = 100;
                this.color = '#39ff14'; // Acid green scout
                this.vy = 3 + Math.random() * 2 + (state.score / 8000);
                this.vx = 0;
                break;
            case 'fighter':
                this.radius = 18;
                this.health = 20 + Math.floor(state.score / 1500);
                this.scoreVal = 200;
                this.color = '#00f0ff'; // Neon blue fighter
                this.vy = 2 + (state.score / 10000);
                this.vx = (Math.random() - 0.5) * 2;
                break;
            case 'elite':
                this.radius = 24;
                this.health = 45 + Math.floor(state.score / 1000);
                this.scoreVal = 450;
                this.color = '#9d00ff'; // Neon purple elite
                this.vy = 1.2 + (state.score / 12000);
                this.vx = Math.random() > 0.5 ? 1.5 : -1.5;
                this.shootInterval = 1500;
                break;
            case 'meteor':
                this.meteorSize = Math.random() > 0.6 ? 2 : 1; // 2 = Large, 1 = Small
                this.radius = this.meteorSize === 2 ? 35 : 20;
                this.health = this.meteorSize === 2 ? 50 : 20;
                this.scoreVal = this.meteorSize === 2 ? 150 : 80;
                this.color = '#bebebe'; // Grey rock
                this.vy = Math.random() * 1.5 + 1.5 + (state.score / 15000);
                this.vx = (Math.random() - 0.5) * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.05;
                break;
        }
    }

    update(dt) {
        const speedMultiplier = dt * 60;
        this.y += this.vy * speedMultiplier;
        this.x += this.vx * speedMultiplier;

        if (this.type === 'fighter') {
            // Move in sine waves horizontally
            this.sineTimer += dt * 5;
            this.vx = Math.sin(this.sineTimer) * 3;
        }

        if (this.type === 'elite') {
            // Keep on screen horizontally, ping ponging
            if (this.x - this.radius < 10 || this.x + this.radius > state.viewportWidth - 10) {
                this.vx = -this.vx;
            }
        }

        if (this.type === 'meteor') {
            this.angle += this.rotSpeed * speedMultiplier;
        }

        // Enemy fires lasers
        const now = Date.now();
        if (now - this.lastShot > this.shootInterval && this.y > 50 && this.y < state.viewportHeight * 0.7) {
            this.shoot();
            this.lastShot = now;
        }
    }

    shoot() {
        if (this.type === 'fighter') {
            projectiles.push(new Projectile(this.x, this.y + 15, 0, 7, '#00f0ff', 15, false));
        } else if (this.type === 'elite') {
            // Shoots two spread or aimed plasma orbs towards player
            if (player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const speed = 7.5;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                projectiles.push(new Projectile(this.x, this.y + 20, vx, vy, '#ff00ff', 25, false));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        if (this.type === 'scout') {
            // Draw clean triangle scout ship pointing down
            ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 16);
            ctx.lineTo(this.x - 14, this.y - 12);
            ctx.lineTo(this.x, this.y - 4);
            ctx.lineTo(this.x + 14, this.y - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'fighter') {
            // Draw futuristic interceptor wings
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 18);
            ctx.lineTo(this.x - 16, this.y - 8);
            ctx.lineTo(this.x - 8, this.y - 16);
            ctx.lineTo(this.x, this.y - 6);
            ctx.lineTo(this.x + 8, this.y - 16);
            ctx.lineTo(this.x + 16, this.y - 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'elite') {
            // Large circular core ship with side wings
            ctx.fillStyle = 'rgba(157, 0, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Wings
            ctx.beginPath();
            ctx.moveTo(this.x - 14, this.y - 5);
            ctx.lineTo(this.x - 28, this.y + 10);
            ctx.lineTo(this.x - 22, this.y - 15);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(this.x + 14, this.y - 5);
            ctx.lineTo(this.x + 28, this.y + 10);
            ctx.lineTo(this.x + 22, this.y - 15);
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 'meteor') {
            // Draw detailed asteroid rock vector outline
            ctx.shadowBlur = 0; // rocks don't glow neon
            ctx.strokeStyle = '#a68260';
            ctx.fillStyle = 'rgba(84, 62, 42, 0.7)';
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            ctx.beginPath();
            const sides = this.meteorSize === 2 ? 10 : 8;
            for (let i = 0; i < sides; i++) {
                const r = this.radius * (0.8 + Math.sin(i * 1.5 + this.sineTimer * 0.05) * 0.15);
                const xVal = Math.cos(i * (Math.PI * 2 / sides)) * r;
                const yVal = Math.sin(i * (Math.PI * 2 / sides)) * r;
                if (i === 0) ctx.moveTo(xVal, yVal);
                else ctx.lineTo(xVal, yVal);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Giant Wave Boss
class Boss {
    constructor() {
        this.x = state.viewportWidth / 2;
        this.y = -100;
        this.targetY = 160;
        this.width = 160;
        this.height = 80;
        this.radius = 70; // collision bubble
        this.health = 500 + (state.bossesDefeated * 250);
        this.maxHealth = this.health;
        this.color = '#ff007f';
        this.shootTimer = 0;
        this.pattern = 0; // Spreads, rings, tracking missiles
        this.lastPatternChange = Date.now();
        this.phase = 1;
        this.vx = 2.5;
        this.introFinished = false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            handleBossDefeated();
        }
    }

    update(dt) {
        const speedMultiplier = dt * 60;
        
        // Entrance animation
        if (!this.introFinished) {
            this.y += (this.targetY - this.y) * 0.05 * speedMultiplier;
            if (Math.abs(this.y - this.targetY) < 2) {
                this.introFinished = true;
            }
            return;
        }

        // Horizontal oscillation
        this.x += this.vx * speedMultiplier;
        if (this.x - this.radius < 50 || this.x + this.radius > state.viewportWidth - 50) {
            this.vx = -this.vx;
        }

        // Switch patterns every 5 seconds
        const now = Date.now();
        if (now - this.lastPatternChange > 5000) {
            this.pattern = (this.pattern + 1) % 3;
            this.lastPatternChange = now;
        }

        // Attack patterns execution
        this.shootTimer += dt * 1000;
        if (this.shootTimer > 250) {
            this.shootTimer = 0;
            this.executeAttack();
        }
    }

    executeAttack() {
        sound.playLaser('heavy');
        
        if (this.pattern === 0) {
            // Multi-beam sweeping spreads
            const count = 7;
            for (let i = 0; i < count; i++) {
                const spreadAngle = (i / (count - 1)) * Math.PI - Math.PI / 2; // -90 to +90 deg
                const angle = spreadAngle + Math.PI / 2; // Aiming downwards general
                const vx = Math.cos(angle) * 6;
                const vy = Math.sin(angle) * 6;
                projectiles.push(new Projectile(this.x + Math.sin(spreadAngle)*20, this.y + 40, vx, vy, '#ff007f', 15, false));
            }
        } else if (this.pattern === 1) {
            // Spiral ring circles
            const steps = 12;
            const offset = (Date.now() / 150) % (Math.PI * 2);
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2 + offset;
                const vx = Math.cos(angle) * 5.5;
                const vy = Math.sin(angle) * 5.5;
                projectiles.push(new Projectile(this.x, this.y + 20, vx, vy, '#ffaa00', 15, false));
            }
            this.shootTimer = -350; // extra pause for bullet hell breathing room
        } else if (this.pattern === 2) {
            // Homing/tracking bursts
            if (player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                // Double side cannons aimed
                projectiles.push(new Projectile(this.x - 40, this.y + 20, Math.cos(angle - 0.1)*8, Math.sin(angle - 0.1)*8, '#00f0ff', 20, false));
                projectiles.push(new Projectile(this.x + 40, this.y + 20, Math.cos(angle + 0.1)*8, Math.sin(angle + 0.1)*8, '#00f0ff', 20, false));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;

        // Draw massive boss ship hulls
        ctx.fillStyle = 'rgba(2, 2, 8, 0.85)';
        ctx.beginPath();
        ctx.moveTo(this.x - 70, this.y - 30);
        ctx.lineTo(this.x - 90, this.y + 10);
        ctx.lineTo(this.x - 40, this.y + 40);
        ctx.lineTo(this.x, this.y + 50);
        ctx.lineTo(this.x + 40, this.y + 40);
        ctx.lineTo(this.x + 90, this.y + 10);
        ctx.lineTo(this.x + 70, this.y - 30);
        ctx.lineTo(this.x, this.y - 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Reactor cores (glowing lights)
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(this.x - 30, this.y, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 30, this.y, 6, 0, Math.PI * 2);
        ctx.arc(this.x, this.y + 15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw boss health bar container on HUD
        ctx.restore();

        // Render boss HP panel top center
        ctx.save();
        const barWidth = 300;
        const barHeight = 8;
        const bx = (state.viewportWidth - barWidth) / 2;
        const by = 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by, barWidth, barHeight);
        ctx.strokeRect(bx, by, barWidth, barHeight);

        const fillWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillStyle = 'linear-gradient(90deg, #ff007f, #ffaa00)';
        ctx.fillStyle = '#ff007f';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff007f';
        ctx.fillRect(bx, by, fillWidth, barHeight);
        
        ctx.font = '12px Orbitron';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText('BOSS DREAD STAR SYSTEM DETECTED', state.viewportWidth / 2, by - 6);
        ctx.restore();
    }
}

// Power-ups and Coins
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'shield', 'multishot', 'repair', 'bomb', 'coin'
        this.radius = type === 'coin' ? 10 : 16;
        this.vy = 2.5;
        this.pulseTimer = 0;
        
        // Match appropriate neon color coding
        this.color = '#ffffff';
        this.initColor();
    }

    initColor() {
        switch (this.type) {
            case 'shield': this.color = '#00f0ff'; break;     // Blue shield
            case 'multishot': this.color = '#ff00ff'; break;   // Purple laser multiplier
            case 'repair': this.color = '#39ff14'; break;      // Green HP repair
            case 'bomb': this.color = '#ff0055'; break;        // Hot red bomb
            case 'coin': this.color = '#ffaa00'; break;        // Gold coin
        }
    }

    update(dt) {
        const speedMultiplier = dt * 60;
        this.y += this.vy * speedMultiplier;
        this.pulseTimer += dt * 10;
        
        // Magnet upgrade logic - pulls coins towards player
        if (this.type === 'coin' && player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);
            // Magnets range extends based on core ship shield stats
            const magnetRadius = 150 + (player.levelStats.maxShield * 0.5); 
            if (dist < magnetRadius) {
                const pullForce = (magnetRadius - dist) / magnetRadius * 9;
                this.x += (dx / dist) * pullForce * speedMultiplier;
                this.y += (dy / dist) * pullForce * speedMultiplier;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10 + Math.sin(this.pulseTimer) * 4;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        if (this.type === 'coin') {
            // Draw spinning gold diamond stardust
            ctx.fillStyle = 'rgba(255, 170, 0, 0.4)';
            ctx.translate(this.x, this.y);
            ctx.rotate(this.pulseTimer * 0.1);
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.7, 0);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius * 0.7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Powerup orb container
            ctx.fillStyle = 'rgba(4, 4, 15, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw interior icon representations
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 12px Rajdhani';
            
            let label = '?';
            if (this.type === 'shield') label = 'S';
            if (this.type === 'multishot') label = 'W';
            if (this.type === 'repair') label = 'H';
            if (this.type === 'bomb') label = 'B';
            
            ctx.fillText(label, this.x, this.y);
        }

        ctx.restore();
    }
}

// Floating Damage/Cash combat texts
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = -1.5;
        this.life = 1.0; // 1 second duration
    }
    update(dt) {
        this.y += this.vy * dt * 60;
        this.life -= dt;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = 'bold 16px Orbitron';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// ================= PROCEDURAL VECTOR DRAW SHIP MODULES =================
function drawPhoenixShip(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    // Main Body
    ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x, y - 24);      // Tip
    ctx.lineTo(x - 20, y + 16);  // Bottom Left
    ctx.lineTo(x, y + 6);       // Thrust notch
    ctx.lineTo(x + 20, y + 16);  // Bottom Right
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side Wings details
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 16);
    ctx.lineTo(x - 26, y + 6);
    ctx.lineTo(x - 12, y - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 16);
    ctx.lineTo(x + 26, y + 6);
    ctx.lineTo(x + 12, y - 2);
    ctx.stroke();
}

function drawTitanShip(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x - 12, y - 10);
    ctx.lineTo(x - 26, y + 10);
    ctx.lineTo(x - 16, y + 25);
    ctx.lineTo(x, y + 18);
    ctx.lineTo(x + 16, y + 25);
    ctx.lineTo(x + 26, y + 10);
    ctx.lineTo(x + 12, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dual Plasma Cannon nodes
    ctx.strokeRect(x - 15, y - 16, 4, 10);
    ctx.strokeRect(x + 11, y - 16, 4, 10);
}

function drawSpecterShip(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
    // Organic curved aerodynamic cockpit
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.quadraticCurveTo(x - 22, y - 2, x - 18, y + 22);
    ctx.lineTo(x, y + 14);
    ctx.lineTo(x + 18, y + 22);
    ctx.quadraticCurveTo(x + 22, y - 2, x, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing sweeps
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 2);
    ctx.lineTo(x - 28, y + 12);
    ctx.lineTo(x - 22, y - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 14, y + 2);
    ctx.lineTo(x + 28, y + 12);
    ctx.lineTo(x + 22, y - 10);
    ctx.stroke();
}

// ================= GAME ENGINE ARRAYS & MANAGEMENT =================
let player = null;
let starfield = new Starfield();
let projectiles = [];
let enemies = [];
let powerups = [];
let particles = [];
let floatingTexts = [];
let boss = null;

let enemySpawnTimer = 0;
let enemySpawnRate = 1600; // spawn enemy every 1.6s initially
let lastTime = 0;
state.screenShake = 0;

// Helper to spawn dynamic particle sets
function spawnParticles(x, y, color, size, vx, vy, life, count = 1) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(
            x, y, color, 
            size * (0.6 + Math.random() * 0.8),
            vx + (Math.random() - 0.5) * 4,
            vy + (Math.random() - 0.5) * 4,
            life * (0.6 + Math.random() * 0.8)
        ));
    }
}

// ================= SCI-FI STAT UPGRADES CALCULATORS =================
function getUpgradedPlayerStats(profileName) {
    const profile = SHIP_PROFILES[profileName];
    const maxHullLvl = state.upgrades.maxHull;
    const shieldRechargeLvl = state.upgrades.shieldRecharge;
    const weaponPowerLvl = state.upgrades.weaponPower;
    const fireRateLvl = state.upgrades.fireRate;

    return {
        // Base profile value + (upgrade_level - 1) * increase_step
        maxHull: profile.baseHealth + (maxHullLvl - 1) * 20,
        maxShield: profile.baseShield + (shieldRechargeLvl - 1) * 15,
        shieldRegen: profile.shieldRegen + (shieldRechargeLvl - 1) * 0.02,
        weaponDamage: 15 + (weaponPowerLvl - 1) * 6,
        fireCooldown: Math.max(80, profile.fireCooldown - (fireRateLvl - 1) * 30) // cooldown decreases (faster rate)
    };
}

// ================= MAIN CORE GAME LOOP =================
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // clamp to prevent clipping bugs on tab switch
    lastTime = timestamp;

    if (state.screen === 'playing') {
        updateGame(dt);
        renderGame();
    } else if (state.screen === 'paused') {
        // Just keep background drawing for parallax depth
        starfield.update(dt);
        renderGame();
    }

    requestAnimationFrame(gameLoop);
}

// ================= GAMEPLAY UPDATE LOGIC =================
function updateGame(dt) {
    // Screen shake damping
    if (state.screenShake > 0) {
        state.screenShake -= dt * 30;
        if (state.screenShake < 0) state.screenShake = 0;
    }

    starfield.update(dt);
    
    if (player) {
        player.update(dt);
    }

    // Update Projectiles
    projectiles.forEach((proj, idx) => {
        proj.update(dt);
        // Offscreen check
        if (proj.y < -30 || proj.y > state.viewportHeight + 30 || proj.x < -30 || proj.x > state.viewportWidth + 30) {
            projectiles.splice(idx, 1);
        }
    });

    // Update Particles
    particles.forEach((part, idx) => {
        part.update(dt);
        if (part.life <= 0) {
            particles.splice(idx, 1);
        }
    });

    // Update Floating text alerts
    floatingTexts.forEach((ft, idx) => {
        ft.update(dt);
        if (ft.life <= 0) {
            floatingTexts.splice(idx, 1);
        }
    });

    // Update Power-ups
    powerups.forEach((pu, idx) => {
        pu.update(dt);
        if (pu.y > state.viewportHeight + 20) {
            powerups.splice(idx, 1);
            return;
        }

        // Collision: Player collects Powerup
        if (player) {
            const dist = Math.hypot(player.x - pu.x, player.y - pu.y);
            if (dist < player.radius + pu.radius) {
                collectPowerUp(pu);
                powerups.splice(idx, 1);
            }
        }
    });

    // Update Boss details
    if (boss) {
        boss.update(dt);
    }

    // Spawn waves of regular enemies (if boss is not alive)
    if (!boss) {
        enemySpawnTimer += dt * 1000;
        if (enemySpawnTimer > enemySpawnRate) {
            spawnRandomEnemy();
            enemySpawnTimer = 0;
            // Ramp up speed slowly as score goes up
            enemySpawnRate = Math.max(500, 1600 - (state.score / 15));
        }

        // Spawn Boss at 5,000 threshold milestones
        const bossThreshold = 5000 + (state.bossesDefeated * 8000);
        if (state.score >= bossThreshold) {
            spawnBoss();
        }
    }

    // Update Enemies
    enemies.forEach((enemy, idx) => {
        enemy.update(dt);
        if (enemy.y > state.viewportHeight + 30) {
            enemies.splice(idx, 1);
            return;
        }

        // Collision: Player runs into Enemy
        if (player) {
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (dist < player.radius + enemy.radius) {
                // heavy structural crunch
                player.takeDamage(enemy.radius * 0.8);
                createExplosionBurst(enemy.x, enemy.y, enemy.color, enemy.radius, 15);
                sound.playExplosion('medium');
                enemies.splice(idx, 1);
                return;
            }
        }
    });

    // Collisions: Bullets to Targets
    handleBulletCollisions();

    // Update UI HUD statistics
    updateHUD();
}

function spawnRandomEnemy() {
    // Determine pool types based on score
    const rand = Math.random() * 100;
    let type = 'scout';

    if (state.score < 1000) {
        type = rand < 80 ? 'scout' : 'meteor';
    } else if (state.score < 2500) {
        type = rand < 50 ? 'scout' : (rand < 80 ? 'meteor' : 'fighter');
    } else {
        // High score = full military suite
        type = rand < 30 ? 'scout' : (rand < 55 ? 'meteor' : (rand < 85 ? 'fighter' : 'elite'));
    }

    enemies.push(new Enemy(type));
}

function spawnBoss() {
    boss = new Boss();
    // Kill off weak entities for dramatic duel entrance
    enemies = [];
    floatingTexts.push(new FloatingText(state.viewportWidth / 2, state.viewportHeight / 2 - 100, "BOSS INCOMING", '#ff007f'));
}

function handleBulletCollisions() {
    projectiles.forEach((proj, pIdx) => {
        if (proj.isPlayerOwned) {
            // Player bullet checks vs Boss
            if (boss) {
                const dist = Math.hypot(proj.x - boss.x, proj.y - boss.y);
                if (dist < boss.radius + proj.radius) {
                    boss.takeDamage(proj.damage);
                    createLaserHitSpark(proj.x, proj.y, proj.color);
                    projectiles.splice(pIdx, 1);
                    return;
                }
            }

            // Player bullet checks vs Enemies
            enemies.forEach((enemy, eIdx) => {
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (dist < enemy.radius + proj.radius) {
                    // Deal damage
                    enemy.health -= proj.damage;
                    createLaserHitSpark(proj.x, proj.y, proj.color);
                    projectiles.splice(pIdx, 1);

                    // Float damage number indicator
                    floatingTexts.push(new FloatingText(enemy.x, enemy.y - 10, `${proj.damage}`, '#ff007f'));

                    if (enemy.health <= 0) {
                        // Reward Points and sound
                        state.score += enemy.scoreVal;
                        sound.playExplosion(enemy.type === 'meteor' && enemy.meteorSize === 2 ? 'large' : 'medium');
                        createExplosionBurst(enemy.x, enemy.y, enemy.color, enemy.radius, enemy.radius / 1.5);
                        
                        // Split Meteor
                        if (enemy.type === 'meteor' && enemy.meteorSize === 2) {
                            splitAsteroid(enemy.x, enemy.y);
                        }

                        // Roll drop rate for loot
                        rollLootDrop(enemy.x, enemy.y, enemy.type);
                        enemies.splice(eIdx, 1);
                    }
                }
            });
        } else {
            // Enemy bullet checks vs Player
            if (player) {
                const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
                if (dist < player.radius + proj.radius) {
                    player.takeDamage(proj.damage);
                    createLaserHitSpark(proj.x, proj.y, proj.color);
                    projectiles.splice(pIdx, 1);
                }
            }
        }
    });
}

function splitAsteroid(x, y) {
    // Spawns 2 smaller meteors moving diagonally outward
    const shard1 = new Enemy('meteor');
    shard1.meteorSize = 1;
    shard1.radius = 20;
    shard1.health = 20;
    shard1.x = x - 15;
    shard1.y = y;
    shard1.vx = -2.5;
    shard1.vy = 3.5;

    const shard2 = new Enemy('meteor');
    shard2.meteorSize = 1;
    shard2.radius = 20;
    shard2.health = 20;
    shard2.x = x + 15;
    shard2.y = y;
    shard2.vx = 2.5;
    shard2.vy = 3.5;

    enemies.push(shard1);
    enemies.push(shard2);
}

function rollLootDrop(x, y, enemyType) {
    const chance = Math.random() * 100;
    // Elite enemies drop high tier powerups reliably, scouts drop stardust coins
    if (enemyType === 'elite') {
        if (chance < 35) powerups.push(new PowerUp(x, y, 'shield'));
        else if (chance < 70) powerups.push(new PowerUp(x, y, 'multishot'));
        else powerups.push(new PowerUp(x, y, 'bomb'));
    } else if (enemyType === 'fighter') {
        if (chance < 20) powerups.push(new PowerUp(x, y, 'shield'));
        else if (chance < 40) powerups.push(new PowerUp(x, y, 'repair'));
        else powerups.push(new PowerUp(x, y, 'coin'));
    } else {
        // Scout/meteor coin drops (40% rates)
        if (chance < 40) {
            powerups.push(new PowerUp(x, y, 'coin'));
        } else if (chance < 44) {
            // Rare repair kit
            powerups.push(new PowerUp(x, y, 'repair'));
        }
    }
}

function collectPowerUp(pu) {
    sound.playPowerUp();

    switch (pu.type) {
        case 'shield':
            player.shield = player.maxShield;
            floatingTexts.push(new FloatingText(player.x, player.y - 30, "SHIELDS CHARGED", '#00f0ff'));
            break;
        case 'multishot':
            player.weaponUpgradeLevel = Math.min(3, player.weaponUpgradeLevel + 1);
            player.weaponDuration = 8.0; // 8 seconds of hypercharge multi lasers
            hudWeaponTypeName.innerText = player.weaponUpgradeLevel === 2 ? "Dual Plasma" : "Triple Blaster";
            hudWeaponTypeName.style.color = "var(--neon-magenta)";
            floatingTexts.push(new FloatingText(player.x, player.y - 30, "WEAPON UPGRADED", '#ff00ff'));
            break;
        case 'repair':
            player.health = Math.min(player.maxHealth, player.health + 30);
            floatingTexts.push(new FloatingText(player.x, player.y - 30, "HULL REPAIRED", '#39ff14'));
            break;
        case 'bomb':
            if (player.bombs < 3) {
                player.bombs++;
                floatingTexts.push(new FloatingText(player.x, player.y - 30, "+1 QUANTUM BOMB", '#ff0055'));
            } else {
                // Max bomb gives cash bonus
                state.coinsCollected += 15;
                state.totalCoins += 15;
                floatingTexts.push(new FloatingText(player.x, player.y - 30, "BONUS +15 STARDUST", '#ffaa00'));
            }
            break;
        case 'coin':
            // Stardust coins reward
            const coinVal = 1;
            state.coinsCollected += coinVal;
            state.totalCoins += coinVal;
            localStorage.setItem('cosmic_stardust', state.totalCoins);
            floatingTexts.push(new FloatingText(pu.x, pu.y, "+1", '#ffaa00'));
            break;
    }
}

function fireQuantumBomb() {
    if (!player || player.bombs <= 0 || state.screen !== 'playing') return;
    
    player.bombs--;
    state.screenShake = 30; // Massive shake
    sound.playBomb();
    
    // Create central supernova shockwave effect
    createExplosionBurst(state.viewportWidth / 2, state.viewportHeight / 2, '#ff0055', 250, 80);

    // Destroy all current regular active enemies
    enemies.forEach(enemy => {
        state.score += Math.floor(enemy.scoreVal * 0.5); // 50% points credit
        createExplosionBurst(enemy.x, enemy.y, enemy.color, enemy.radius, 10);
    });
    enemies = [];

    // Deal heavy damage to Boss if present
    if (boss) {
        boss.takeDamage(200);
        floatingTexts.push(new FloatingText(boss.x, boss.y - 30, "-200 SHOCK DAMAGE", '#ff0055'));
    }

    // Clear all hostile projectiles
    projectiles = projectiles.filter(p => p.isPlayerOwned);

    floatingTexts.push(new FloatingText(player.x, player.y - 40, "QUANTUM DISCHARGE!", '#ff0055'));
}

// Particle Visual Bursts Helpers
function createExplosionBurst(x, y, color, radius, count) {
    for (let i = 0; i < count; i++) {
        const speed = Math.random() * 4 + 2;
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(
            x, y, color, 
            Math.random() * 4 + 1.5,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.5 + Math.random() * 0.5
        ));
    }
}

function createLaserHitSpark(x, y, color) {
    // Small quick flare
    for (let i = 0; i < 4; i++) {
        particles.push(new Particle(
            x, y, color, 1,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            0.15
        ));
    }
}

function handleBossDefeated() {
    state.bossesDefeated++;
    state.score += 2000;
    state.screenShake = 40;
    sound.playExplosion('large');

    // Create huge explosions at boss site
    createExplosionBurst(boss.x, boss.y, '#ff007f', 120, 60);
    createExplosionBurst(boss.x - 30, boss.y, '#00f0ff', 80, 30);
    createExplosionBurst(boss.x + 30, boss.y, '#ffaa00', 80, 30);

    // Drop large reward cache (powerups + stardust pile)
    for (let i = 0; i < 15; i++) {
        powerups.push(new PowerUp(boss.x + (Math.random() - 0.5) * 80, boss.y + (Math.random() - 0.5) * 40, 'coin'));
    }
    powerups.push(new PowerUp(boss.x - 40, boss.y, 'shield'));
    powerups.push(new PowerUp(boss.x + 40, boss.y, 'multishot'));

    boss = null;
    floatingTexts.push(new FloatingText(state.viewportWidth / 2, state.viewportHeight / 2, "BOSS SYSTEM ANNIHILATED", '#39ff14'));
}

// ================= CANVAS RENDER LOOP =================
function renderGame() {
    ctx.clearRect(0, 0, state.viewportWidth, state.viewportHeight);

    // Render Starfield Background
    starfield.draw(ctx);

    // Context translation helper for screen shake
    ctx.save();
    if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
    }

    // Draw Power-ups
    powerups.forEach(pu => pu.draw(ctx));

    // Draw Projectiles
    projectiles.forEach(proj => proj.draw(ctx));

    // Draw Enemies
    enemies.forEach(enemy => enemy.draw(ctx));

    // Draw Boss
    if (boss) {
        boss.draw(ctx);
    }

    // Draw Player
    if (player) {
        player.draw(ctx);
    }

    // Draw VFX Particles
    particles.forEach(part => part.draw(ctx));

    // Draw Floating Damage/Cash Numbers
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
}

// ================= DOM ELEMENT REFERENCES =================
const screenStart = document.getElementById('start-screen');
const screenHUD = document.getElementById('hud-container');
const screenPause = document.getElementById('pause-screen');
const screenShop = document.getElementById('shop-screen');
const screenGameOver = document.getElementById('gameover-screen');

// HUD details
const hudHealthBar = document.getElementById('health-bar');
const hudHealthVal = document.getElementById('health-value');
const hudShieldBar = document.getElementById('shield-bar');
const hudShieldVal = document.getElementById('shield-value');
const hudScoreVal = document.getElementById('hud-score-val');
const hudCoinsVal = document.getElementById('hud-coins-val');
const hudWeaponTypeName = document.getElementById('weapon-type-name');
const hudBombSlots = document.querySelector('.bomb-slots');

// Interactive button bindings
const btnLaunch = document.getElementById('btn-launch');
const btnResume = document.getElementById('btn-resume');
const btnShopOpen = document.getElementById('btn-shop-open');
const btnRestart = document.getElementById('btn-restart');
const btnShopBack = document.getElementById('btn-shop-back');
const btnGoShop = document.getElementById('btn-go-shop');
const btnGoAgain = document.getElementById('btn-go-again');

const btnHudPause = document.getElementById('btn-hud-pause');
const btnHudMute = document.getElementById('btn-hud-mute');

// Shop values bindings
const shopBalanceVal = document.getElementById('shop-balance-val');

// ================= DOM UPDATE HUD WRAPPER =================
function updateHUD() {
    if (!player) return;
    
    // Health HUD
    const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
    hudHealthBar.style.width = `${healthPercent}%`;
    hudHealthVal.innerText = `${Math.ceil(player.health)}/${player.maxHealth}`;

    // Shield HUD
    const shieldPercent = Math.max(0, (player.shield / player.maxShield) * 100);
    hudShieldBar.style.width = `${shieldPercent}%`;
    hudShieldVal.innerText = `${Math.ceil(player.shield)}/${player.maxShield}`;

    // Score & Coins
    hudScoreVal.innerText = String(state.score).padStart(6, '0');
    hudCoinsVal.innerText = `✨ ${state.coinsCollected}`;

    // Bomb slots circles representation
    let bombHTML = '';
    for (let i = 0; i < 3; i++) {
        if (i < player.bombs) {
            bombHTML += '<div class="bomb-icon"></div>';
        } else {
            bombHTML += '<div class="bomb-icon spent"></div>';
        }
    }
    hudBombSlots.innerHTML = bombHTML;
}

// ================= SCREEN TRANSITION HANDLERS =================
function initMission() {
    sound.init();
    sound.startBGM();

    state.score = 0;
    state.coinsCollected = 0;
    state.bossesDefeated = 0;

    projectiles = [];
    enemies = [];
    powerups = [];
    particles = [];
    floatingTexts = [];
    boss = null;
    
    player = new Player(state.activeShip);

    screenStart.classList.add('hidden');
    screenPause.classList.add('hidden');
    screenGameOver.classList.add('hidden');
    screenShop.classList.add('hidden');
    
    screenHUD.classList.remove('hidden');
    state.screen = 'playing';

    lastTime = 0;
}

function togglePause() {
    if (state.screen === 'playing') {
        state.screen = 'paused';
        screenPause.classList.remove('hidden');
    } else if (state.screen === 'paused') {
        state.screen = 'playing';
        screenPause.classList.add('hidden');
        lastTime = 0; // Reset delta timer
    }
    sound.playClick();
}

function triggerGameOver() {
    state.screen = 'gameover';
    sound.playExplosion('large');

    // Persist final coin stardust balances
    localStorage.setItem('cosmic_stardust', state.totalCoins);

    // Update game over DOM readouts
    document.getElementById('go-score-val').innerText = state.score;
    document.getElementById('go-coins-val').innerText = `✨ ${state.coinsCollected}`;
    document.getElementById('go-boss-val').innerText = state.bossesDefeated;

    screenHUD.classList.add('hidden');
    screenGameOver.classList.remove('hidden');
}

function openUpgradeShop() {
    state.screen = 'shop';
    
    // Hide pause or gameover overlays
    screenPause.classList.add('hidden');
    screenGameOver.classList.add('hidden');
    
    // Draw current balance
    shopBalanceVal.innerText = `✨ ${state.totalCoins}`;
    
    // Rebuild shop upgrade rows
    updateShopInterface();

    screenShop.classList.remove('hidden');
    sound.playClick();
}

function closeUpgradeShop() {
    screenShop.classList.add('hidden');
    
    if (player && player.health > 0) {
        // Return to pause screen
        screenPause.classList.remove('hidden');
        state.screen = 'paused';
    } else {
        // Return to start landing screen
        screenStart.classList.remove('hidden');
        state.screen = 'start';
    }
    sound.playClick();
}

// ================= SHOP INTERFACE BUILDER & UPGRADERS =================
function updateShopInterface() {
    shopBalanceVal.innerText = `✨ ${state.totalCoins}`;

    const upgrades = ['maxHull', 'shieldRecharge', 'weaponPower', 'fireRate'];
    
    upgrades.forEach(upgradeKey => {
        const lvl = state.upgrades[upgradeKey];
        const costArray = state.upgradeCosts[upgradeKey];
        const cost = costArray[lvl - 1]; // next upgrade cost

        // Level text indicator
        document.getElementById(`lvl-${upgradeKey}`).innerText = cost !== null ? `${lvl}/5` : 'MAX';

        // Progress bar steps mapping
        const progressContainer = document.getElementById(`progress-${upgradeKey}`);
        let pipsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= lvl) {
                pipsHTML += '<div class="shop-pip active"></div>';
            } else {
                pipsHTML += '<div class="shop-pip"></div>';
            }
        }
        progressContainer.innerHTML = pipsHTML;

        // Buy button price status
        const priceLabel = document.getElementById(`price-${upgradeKey}`);
        const buyBtn = document.getElementById(`btn-buy-${upgradeKey}`);
        
        if (cost === null) {
            priceLabel.innerText = "MAX TIER";
            priceLabel.className = "shop-price maxed";
            buyBtn.disabled = true;
            buyBtn.innerText = "MAXED";
        } else {
            priceLabel.innerText = `✨ ${cost}`;
            priceLabel.className = "shop-price";
            buyBtn.innerText = "UPGRADE";
            
            // disable if insufficient funds
            if (state.totalCoins >= cost) {
                buyBtn.disabled = false;
            } else {
                buyBtn.disabled = true;
            }
        }
    });
}

function purchaseUpgrade(upgradeKey) {
    const lvl = state.upgrades[upgradeKey];
    const costArray = state.upgradeCosts[upgradeKey];
    const cost = costArray[lvl - 1];

    if (cost !== null && state.totalCoins >= cost) {
        state.totalCoins -= cost;
        state.upgrades[upgradeKey]++;
        
        // Save database upgrades
        localStorage.setItem('cosmic_stardust', state.totalCoins);
        localStorage.setItem('cosmic_upgrades', JSON.stringify(state.upgrades));
        
        sound.playPowerUp();
        updateShopInterface();
        
        // Apply stats directly to player object if mid-game pause upgrade occurred
        if (player) {
            player.levelStats = getUpgradedPlayerStats(player.profileName);
            player.maxHealth = player.levelStats.maxHull;
            player.maxShield = player.levelStats.maxShield;
            player.shieldRecharge = player.levelStats.shieldRegen;
            player.weaponPower = player.levelStats.weaponDamage;
            player.fireCooldown = player.levelStats.fireCooldown;
        }
    }
}

// Bind shop upgrade buttons dynamically
['maxHull', 'shieldRecharge', 'weaponPower', 'fireRate'].forEach(upgradeKey => {
    document.getElementById(`btn-buy-${upgradeKey}`).addEventListener('click', () => {
        purchaseUpgrade(upgradeKey);
    });
});

// ================= USER INTERACTIVE ACTIONS BINDINGS =================

// Select active fighter card clicking
document.querySelectorAll('.ship-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.ship-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.activeShip = card.dataset.ship;
        sound.init(); // Warm audio context
        sound.playClick();
    });
});

// Controls buttons links
btnLaunch.addEventListener('click', () => {
    initMission();
    sound.playClick();
});

btnResume.addEventListener('click', () => {
    togglePause();
});

btnShopOpen.addEventListener('click', () => {
    openUpgradeShop();
});

btnRestart.addEventListener('click', () => {
    if (confirm("Abandon mission parameters and return to space dock?")) {
        screenPause.classList.add('hidden');
        screenHUD.classList.add('hidden');
        screenStart.classList.remove('hidden');
        state.screen = 'start';
        sound.stopBGM();
        sound.playClick();
    }
});

btnShopBack.addEventListener('click', () => {
    closeUpgradeShop();
});

btnGoShop.addEventListener('click', () => {
    openUpgradeShop();
});

btnGoAgain.addEventListener('click', () => {
    initMission();
    sound.playClick();
});

btnHudPause.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
});

btnHudMute.addEventListener('click', (e) => {
    e.stopPropagation();
    sound.init();
    const isMuted = sound.toggleMute();
    btnHudMute.innerText = isMuted ? '🔇' : '🔊';
});

// Start Requesting frame loops
requestAnimationFrame(gameLoop);
