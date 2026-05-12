import Enemy from '@assets/js/GameEnginev1.1/essentials/Enemy.js';
import Player from '@assets/js/GameEnginev1.1/essentials/Player.js';
import showDeathScreen from './DeathScreen.js';

/**
 * Unified Scythe class - handles all scythe types with a type parameter
 * Types: 'regular', 'special', 'ultra', 'super', 'boss'
 */
class UnifiedScythe extends Enemy {
    constructor(gameEnv, type = 'regular', spawnX = null, spawnY = null) {
        const path = gameEnv.path;
        const width = gameEnv.innerWidth;

        // Type-specific configuration
        const typeConfig = UnifiedScythe.getTypeConfig(type, path, width, spawnX, spawnY, gameEnv);

        const scytheData = {
            id: `${type}_scythe_${Math.random().toString(36).substr(2, 9)}`,
            src: path + "/images/mansionGame/scythe.png",
            SCALE_FACTOR: typeConfig.scaleFactor,
            ANIMATION_RATE: 10,
            pixels: { width: 64, height: 64 },
            INIT_POSITION: typeConfig.position,
            orientation: { rows: 1, columns: 1 },
            down: { row: 0, start: 0, columns: 1 },
            hitbox: typeConfig.hitbox
        };

        super(scytheData, gameEnv);

        // Store type and configuration
        this.scytheType = type;
        this.typeConfig = typeConfig;

        // Initialize hittingNPC flag
        this._hittingNPC ??= false;

        // Set type-specific flags
        this.setTypeFlags();

        // Disable dialogue system for all scythes
        if (this.dialogueSystem) {
            this.dialogueSystem = null;
        }

        if (this.removeInteractKeyListeners) {
            this.removeInteractKeyListeners();
        }

        // Initialize motion properties
        this.initializeMotion(spawnX, spawnY);

        // State tracking
        this.revComplete = false;
        this.rotationAngle = 0;
        this.rotationSpeed = typeConfig.rotationSpeed;

        // Track fusion state for higher-level scythes
        this.hasFused = false;

        // Manual image loading
        this.spriteSheet = new Image();
        this.imageLoaded = false;
        this.spriteSheet.onload = () => {
            this.imageLoaded = true;
        };
        this.spriteSheet.src = path + "/images/mansionGame/scythe.png";

        // Visual effects
        this.glowColor = typeConfig.glowColor;
        this.pulseTimer = 0;
        this.pulseSpeed = typeConfig.pulseSpeed;

        // Lifetime properties (if applicable)
        if (typeConfig.lifespan) {
            this.creationTime = Date.now();
            this.lifespan = typeConfig.lifespan;
        }

        // Auto-destroy radius (if applicable)
        if (typeConfig.autoDestroyRadius) {
            this.autoDestroyRadius = typeConfig.autoDestroyRadius;
        }

        // Create entrance effect for boss scythes
        if (type === 'boss') {
            this.createBossEntrance(spawnX + this.width / 2, spawnY + this.height / 2);
        } else if (type === 'super') {
            this.createFormationExplosion(spawnX + this.width / 2, spawnY + this.height / 2);
        }
    }

    static getTypeConfig(type, path, width, spawnX, spawnY, gameEnv) {
        const configs = {
            regular: {
                scaleFactor: 10,
                position: UnifiedScythe.getRegularSpawnPosition(gameEnv, spawnX, spawnY),
                hitbox: { widthPercentage: 0.3, heightPercentage: 0.3 },
                rotationSpeed: 0.1,
                glowColor: null,
                pulseSpeed: 0,
                lifespan: null,
                autoDestroyRadius: null,
                motionType: 'ellipse',
                projectileSpeed: 0.01
            },
            special: {
                scaleFactor: 6,
                position: { x: spawnX !== null ? spawnX : Math.random() * (width - 100), y: spawnY !== null ? spawnY : -100 },
                hitbox: { widthPercentage: 0.3, heightPercentage: 0.3 },
                rotationSpeed: 0.1,
                glowColor: '#ff0000',
                pulseSpeed: 0.1,
                lifespan: 60000,
                autoDestroyRadius: null,
                motionType: 'bounce',
                velocity: { x: (Math.random() - 0.5) * 8, y: Math.random() * 3 + 2 }
            },
            ultra: {
                scaleFactor: 4,
                position: { x: spawnX || 0, y: spawnY || 0 },
                hitbox: { widthPercentage: 0.4, heightPercentage: 0.4 },
                rotationSpeed: 0.15,
                glowColor: '#ff00ff',
                pulseSpeed: 0.15,
                lifespan: 30000,
                autoDestroyRadius: 300,
                motionType: 'bounce',
                velocity: { x: (Math.random() - 0.5) * 6, y: Math.random() * 2 + 1 }
            },
            super: {
                scaleFactor: 2,
                position: { x: spawnX || 0, y: spawnY || 0 },
                hitbox: { widthPercentage: 0.5, heightPercentage: 0.5 },
                rotationSpeed: 0.25,
                glowColor: '#ffd700',
                pulseSpeed: 0.2,
                lifespan: 30000,
                autoDestroyRadius: 500,
                motionType: 'bounce',
                velocity: { x: (Math.random() - 0.5) * 8, y: Math.random() * 3 + 2 }
            },
            boss: {
                scaleFactor: 1,
                position: { x: spawnX || 0, y: spawnY || 0 },
                hitbox: { widthPercentage: 0.6, heightPercentage: 0.6 },
                rotationSpeed: 0.35,
                glowColor: '#00BFFF',
                pulseSpeed: 0.25,
                lifespan: 45000,
                autoDestroyRadius: 700,
                motionType: 'bounce',
                velocity: { x: (Math.random() - 0.5) * 10, y: Math.random() * 4 + 3 }
            }
        };

        return configs[type] || configs.regular;
    }

    static getRegularSpawnPosition(gameEnv, spawnX, spawnY) {
        // For regular scythes, spawn from player position like original
        const players = gameEnv.gameObjects.filter(obj => obj instanceof Player);
        if (players.length === 0) {
            console.error("No player found in game environment");
            return { x: 0, y: 0 };
        }
        const player = players[0];
        const spawnXPos = player.position.x;
        const spawnYPos = player.position.y;
        const targetXPos = spawnX !== null ? spawnX : Math.random() * (gameEnv.innerWidth - 64);
        const targetYPos = -64;

        return { x: spawnXPos, y: spawnYPos };
    }

    setTypeFlags() {
        // Set compatibility flags for collision detection
        this.isSpecial = ['special', 'ultra', 'super', 'boss'].includes(this.scytheType);
        this.isUltra = ['ultra', 'super', 'boss'].includes(this.scytheType);
        this.isSuper = ['super', 'boss'].includes(this.scytheType);
        this.isBoss = this.scytheType === 'boss';
    }

    initializeMotion(spawnX, spawnY) {
        if (this.typeConfig.motionType === 'ellipse') {
            // Elliptical motion for regular scythes
            const players = this.gameEnv.gameObjects.filter(obj => obj instanceof Player);
            if (players.length > 0) {
                const player = players[0];
                const spawnXPos = player.position.x;
                const spawnYPos = player.position.y;
                const targetXPos = spawnX !== null ? spawnX : Math.random() * (this.gameEnv.innerWidth - 64);
                const targetYPos = -64;

                this.source_coords = { x: spawnXPos, y: spawnYPos };
                this.target_coords = { x: targetXPos, y: targetYPos };

                this.ellipse_center = {
                    x: (spawnXPos + targetXPos) / 2,
                    y: (spawnYPos + targetYPos) / 2
                };

                this.ellipse_width = Math.sqrt((targetXPos - spawnXPos) ** 2 + (targetYPos - spawnYPos) ** 2);
                this.ellipse_height = this.ellipse_width / 3;
                this.ellipse_tilt = Math.atan2(targetYPos - spawnYPos, targetXPos - spawnXPos);

                this.radian_prog = 0;
                this.radian_limit = 2 * Math.PI;
                this.projectileSpeed = this.typeConfig.projectileSpeed;
            }

            // Override default velocity
            this.velocity.x = 0;
            this.velocity.y = 0;
        } else {
            // Bouncing motion for special+ scythes
            this.velocity = this.typeConfig.velocity;
        }
    }

    update() {
        if (this.revComplete) return;

        // Check lifespan for timed scythes
        if (this.lifespan && this.creationTime) {
            const currentTime = Date.now();
            if (currentTime - this.creationTime >= this.lifespan) {
                this.revComplete = true;
                if (this.scytheType === 'super') {
                    this.createDestructionExplosion(this.position.x + this.width / 2, this.position.y + this.height / 2);
                } else if (this.scytheType === 'boss') {
                    this.createBossDestructionExplosion(this.position.x + this.width / 2, this.position.y + this.height / 2);
                }
                this.destroy();
                return;
            }
        }

        // Handle NPC collisions
        if (this.scytheType === 'regular') {
            this.checkNPCCollision();
        } else {
            // Special+ scythes ignore NPC collisions
            this._hittingNPC = false;
        }

        // Update motion
        this.updateMotion();

        // Update rotation
        this.rotationAngle += this.rotationSpeed;

        // Update pulsing
        if (this.pulseSpeed > 0) {
            this.pulseTimer += this.pulseSpeed;
        }

        // Type-specific behaviors
        this.updateTypeSpecificBehaviors();

        // Check player collision
        this.checkPlayerCollision();

        super.update();
    }

    updateMotion() {
        if (this.typeConfig.motionType === 'ellipse') {
            // Elliptical motion for regular scythes
            if (this.radian_prog >= this.radian_limit) {
                this.revComplete = true;
                this.destroy();
                return;
            }

            this.radian_prog += this.projectileSpeed;

            const cosProg = Math.cos(this.radian_prog);
            const sinProg = Math.sin(this.radian_prog);
            const cosTilt = Math.cos(this.ellipse_tilt);
            const sinTilt = Math.sin(this.ellipse_tilt);

            const x_coord = this.ellipse_center.x +
                (this.ellipse_width / 2) * cosProg * cosTilt -
                this.ellipse_height * sinProg * sinTilt;

            const y_coord = this.ellipse_center.y +
                (this.ellipse_width / 2) * cosProg * sinTilt +
                this.ellipse_height * sinProg * cosTilt;

            this.position.x = x_coord;
            this.position.y = y_coord;
        } else {
            // Bouncing motion for special+ scythes
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            // Bounce off screen edges
            if (this.position.x <= 0 || this.position.x >= this.gameEnv.innerWidth - this.width) {
                this.velocity.x = -this.velocity.x;
                this.position.x = Math.max(0, Math.min(this.gameEnv.innerWidth - this.width, this.position.x));

                // Boss scythes speed up on bounce
                if (this.scytheType === 'boss') {
                    this.velocity.x *= 1.1;
                    this.velocity.x = Math.max(-15, Math.min(15, this.velocity.x));
                }
            }

            if (this.position.y <= 0 || this.position.y >= this.gameEnv.innerHeight - this.height) {
                this.velocity.y = -this.velocity.y;
                this.position.y = Math.max(0, Math.min(this.gameEnv.innerHeight - this.height, this.position.y));

                // Boss scythes speed up on bounce
                if (this.scytheType === 'boss') {
                    this.velocity.y *= 1.1;
                    this.velocity.y = Math.max(-8, Math.min(8, this.velocity.y));
                }
            }
        }
    }

    updateTypeSpecificBehaviors() {
        switch (this.scytheType) {
            case 'special':
                this.checkRegularScytheCollisions();
                this.checkSpecialScytheCollisions();
                break;
            case 'ultra':
                this.autoDestroyNearbyScythes();
                this.checkUltraScytheCollisions();
                break;
            case 'super':
                this.autoDestroyNearbyScythes();
                this.checkSuperScytheCollisions();
                break;
            case 'boss':
                this.autoDestroyNearbyScythes();
                this.destroyNearbyInterceptors();
                break;
        }
    }

    checkRegularScytheCollisions() {
        const regularScythes = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'UnifiedScythe' && obj.scytheType === 'regular'
        );

        regularScythes.forEach(regularScythe => {
            const specialCenterX = this.position.x + this.width / 2;
            const specialCenterY = this.position.y + this.height / 2;
            const regularCenterX = regularScythe.position.x + regularScythe.width / 2;
            const regularCenterY = regularScythe.position.y + regularScythe.height / 2;

            const dx = regularCenterX - specialCenterX;
            const dy = regularCenterY - specialCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + regularScythe.width) / 3;

            if (distance <= HIT_DISTANCE) {
                regularScythe.revComplete = true;
                regularScythe.destroy();
                this.createExplosionEffect(regularCenterX, regularCenterY);
            }
        });
    }

    checkSpecialScytheCollisions() {
        const otherSpecialScythes = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'UnifiedScythe' && obj.scytheType === 'special' &&
            obj !== this && !obj.revComplete
        );

        for (const otherSpecialScythe of otherSpecialScythes) {
            const thisCenterX = this.position.x + this.width / 2;
            const thisCenterY = this.position.y + this.height / 2;
            const otherCenterX = otherSpecialScythe.position.x + otherSpecialScythe.width / 2;
            const otherCenterY = otherSpecialScythe.position.y + otherSpecialScythe.height / 2;

            const dx = otherCenterX - thisCenterX;
            const dy = otherCenterY - thisCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + otherSpecialScythe.width) / 3;

            if (distance <= HIT_DISTANCE) {
                const fusionX = (thisCenterX + otherCenterX) / 2;
                const fusionY = (thisCenterY + otherCenterY) / 2;
                this.createFusionScythe(fusionX, fusionY);

                this.revComplete = true;
                this.destroy();
                otherSpecialScythe.revComplete = true;
                otherSpecialScythe.destroy();
                break;
            }
        }
    }

    createFusionScythe(x, y) {
        this.createFusionEffect(x, y);
        const ultraScythe = new UnifiedScythe(this.gameEnv, 'ultra', x, y);
        this.gameEnv.gameObjects.push(ultraScythe);
        this.gameEnv.container.appendChild(ultraScythe.canvas);
    }

    checkUltraScytheCollisions() {
        if (this.hasFused) return;

        const otherUltraScythes = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'UnifiedScythe' && obj.scytheType === 'ultra' &&
            obj !== this && !obj.hasFused && !obj.revComplete
        );

        for (const otherUltraScythe of otherUltraScythes) {
            const thisCenterX = this.position.x + this.width / 2;
            const thisCenterY = this.position.y + this.height / 2;
            const otherCenterX = otherUltraScythe.position.x + otherUltraScythe.width / 2;
            const otherCenterY = otherUltraScythe.position.y + otherUltraScythe.height / 2;

            const dx = otherCenterX - thisCenterX;
            const dy = otherCenterY - thisCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + otherUltraScythe.width) / 3;

            if (distance <= HIT_DISTANCE) {
                const midX = (this.position.x + otherUltraScythe.position.x) / 2;
                const midY = (this.position.y + otherUltraScythe.position.y) / 2;

                const superScythe = new UnifiedScythe(this.gameEnv, 'super', midX, midY);
                this.gameEnv.gameObjects.push(superScythe);
                this.gameEnv.container.appendChild(superScythe.canvas);

                this.hasFused = true;
                otherUltraScythe.hasFused = true;
                this.revComplete = true;
                otherUltraScythe.revComplete = true;

                this.createFusionExplosion(midX + superScythe.width / 2, midY + superScythe.height / 2);

                this.destroy();
                otherUltraScythe.destroy();
                break;
            }
        }
    }

    checkSuperScytheCollisions() {
        if (this.hasFused) return;

        const otherSuperScythes = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'UnifiedScythe' && obj.scytheType === 'super' &&
            obj !== this && !obj.hasFused && !obj.revComplete
        );

        for (const otherSuperScythe of otherSuperScythes) {
            const thisCenterX = this.position.x + this.width / 2;
            const thisCenterY = this.position.y + this.height / 2;
            const otherCenterX = otherSuperScythe.position.x + otherSuperScythe.width / 2;
            const otherCenterY = otherSuperScythe.position.y + otherSuperScythe.height / 2;

            const dx = otherCenterX - thisCenterX;
            const dy = otherCenterY - thisCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + otherSuperScythe.width) / 3;

            if (distance <= HIT_DISTANCE) {
                const midX = (this.position.x + otherSuperScythe.position.x) / 2;
                const midY = (this.position.y + otherSuperScythe.position.y) / 2;

                const bossScythe = new UnifiedScythe(this.gameEnv, 'boss', midX, midY);
                this.gameEnv.gameObjects.push(bossScythe);
                this.gameEnv.container.appendChild(bossScythe.canvas);

                this.hasFused = true;
                otherSuperScythe.hasFused = true;
                this.revComplete = true;
                otherSuperScythe.revComplete = true;

                this.createUltimateFusionExplosion(midX + bossScythe.width / 2, midY + bossScythe.height / 2);

                this.destroy();
                otherSuperScythe.destroy();
                break;
            }
        }
    }

    autoDestroyNearbyScythes() {
        if (!this.autoDestroyRadius) return;

        // Find all scythes (only unified scythes now)
        const allScythes = this.gameEnv.gameObjects.filter(obj => {
            if (obj === this || obj.revComplete) return false;

            if (obj.constructor.name === 'UnifiedScythe') {
                // Don't destroy scythes of equal or higher level
                return this.isHigherLevelThan(obj.scytheType);
            }
            return false;
        });

        allScythes.forEach(scythe => {
            const dx = scythe.position.x - this.position.x;
            const dy = scythe.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.autoDestroyRadius) {
                scythe.revComplete = true;
                scythe.destroy();
                this.createSmallExplosion(scythe.position.x + scythe.width / 2, scythe.position.y + scythe.height / 2);
            }
        });
    }

    isHigherLevelThan(otherType) {
        const hierarchy = ['regular', 'special', 'ultra', 'super', 'boss'];
        const thisLevel = hierarchy.indexOf(this.scytheType);
        const otherLevel = hierarchy.indexOf(otherType);
        return thisLevel > otherLevel;
    }

    destroyNearbyInterceptors() {
        if (this.scytheType !== 'boss') return;

        const interceptors = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'Interceptor'
        );

        interceptors.forEach(interceptor => {
            const dx = interceptor.position.x - this.position.x;
            const dy = interceptor.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 400) {
                interceptor.revComplete = true;
                interceptor.destroy();
                this.createInterceptorDestroyEffect(interceptor.position.x + interceptor.width / 2, interceptor.position.y + interceptor.height / 2);
            }
        });
    }

    checkPlayerCollision() {
        const players = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'Player' ||
            (obj.isPlayer !== undefined && obj.isPlayer)
        );

        if (players.length === 0) return;

        for (const player of players) {
            const scytheCenterX = this.position.x + this.width / 2;
            const scytheCenterY = this.position.y + this.height / 2;
            const playerCenterX = player.position.x + player.width / 2;
            const playerCenterY = player.position.y + player.height / 2;

            const dx = playerCenterX - scytheCenterX;
            const dy = playerCenterY - scytheCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + player.width) / 3;

            if (distance <= HIT_DISTANCE) {
                this.handleCollisionWithPlayer();
                break;
            }
        }
    }

    checkNPCCollision() {
        const npcs = this.gameEnv.gameObjects.filter(obj =>
            obj.constructor.name === 'Npc' ||
            (obj.isNpc !== undefined && obj.isNpc)
        );

        if (npcs.length === 0) return;

        for (const npc of npcs) {
            const scytheCenterX = this.position.x + this.width / 2;
            const scytheCenterY = this.position.y + this.height / 2;
            const npcCenterX = npc.position.x + npc.width / 2;
            const npcCenterY = npc.position.y + npc.height / 2;

            const dx = npcCenterX - scytheCenterX;
            const dy = npcCenterY - scytheCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const HIT_DISTANCE = (this.width + npc.width) / 3;

            if (distance <= HIT_DISTANCE) {
                this._hittingNPC = true;
                break;
            }
        }
    }

    handleCollisionWithPlayer() {
        this.revComplete = true;

        if (this.scytheType === 'super') {
            this.createDestructionExplosion(this.position.x + this.width / 2, this.position.y + this.height / 2);
        } else if (this.scytheType === 'boss') {
            this.createBossDestructionExplosion(this.position.x + this.width / 2, this.position.y + this.height / 2);
        }

        this.destroy();

        const player = this.gameEnv.gameObjects.find(obj => obj.constructor.name === 'Player');
        showDeathScreen(player);
    }

    draw() {
        if (!this.imageLoaded) {
            return;
        }

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(this.rotationAngle);

        // Add pulsing scale effect for special+ scythes
        if (this.pulseSpeed > 0) {
            const pulseScale = 1 + Math.sin(this.pulseTimer) * (this.scytheType === 'boss' ? 0.25 : this.scytheType === 'super' ? 0.2 : 0.1);
            this.ctx.scale(pulseScale, pulseScale);
        }

        // Add glow effect for special+ scythes
        if (this.glowColor) {
            this.ctx.shadowColor = this.glowColor;
            this.ctx.shadowBlur = this.scytheType === 'boss' ? 40 : this.scytheType === 'super' ? 30 : this.scytheType === 'ultra' ? 20 : 15;

            // Add gradient effects for super and boss scythes
            if (this.scytheType === 'super') {
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ffd700');
                gradient.addColorStop(0.6, '#ff6b35');
                gradient.addColorStop(1, '#ff00ff');
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 25;
            } else if (this.scytheType === 'boss') {
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
                gradient.addColorStop(0, '#FFFFFF');
                gradient.addColorStop(0.2, '#00BFFF');
                gradient.addColorStop(0.5, '#1E90FF');
                gradient.addColorStop(0.8, '#4169E1');
                gradient.addColorStop(1, '#000080');
                this.ctx.shadowColor = '#00BFFF';
                this.ctx.shadowBlur = 35;
            }
        }

        this.ctx.drawImage(
            this.spriteSheet,
            0, 0, this.spriteSheet.naturalWidth, this.spriteSheet.naturalHeight,
            -this.width / 2, -this.height / 2, this.width, this.height
        );

        this.ctx.restore();
        this.setupCanvas();
    }

    canBeIntercepted() {
        return this.scytheType === 'regular';
    }

    handleInterceptorCollision(interceptor) {
        return this.scytheType === 'regular';
    }

    // Visual effects methods (simplified versions)
    createFusionEffect(x, y) {
        const fusionFlash = document.createElement('div');
        fusionFlash.style.position = 'absolute';
        fusionFlash.style.left = x + 'px';
        fusionFlash.style.top = y + 'px';
        fusionFlash.style.width = '80px';
        fusionFlash.style.height = '80px';
        fusionFlash.style.backgroundColor = '#ffffff';
        fusionFlash.style.borderRadius = '50%';
        fusionFlash.style.transform = 'translate(-50%, -50%)';
        fusionFlash.style.pointerEvents = 'none';
        fusionFlash.style.zIndex = '1002';
        fusionFlash.style.boxShadow = '0 0 30px 15px rgba(255, 0, 255, 0.9)';

        const gameContainer = this.gameEnv.canvasContainer || document.body;
        gameContainer.appendChild(fusionFlash);

        let flashScale = 1;
        let flashOpacity = 1;
        const animateFusion = () => {
            flashScale += 0.4;
            flashOpacity -= 0.1;

            fusionFlash.style.transform = `translate(-50%, -50%) scale(${flashScale})`;
            fusionFlash.style.opacity = flashOpacity;

            if (flashOpacity > 0) {
                requestAnimationFrame(animateFusion);
            } else {
                gameContainer.removeChild(fusionFlash);
            }
        };

        requestAnimationFrame(animateFusion);
    }

    createExplosionEffect(x, y) {
        const explosion = document.createElement('div');
        explosion.style.position = 'absolute';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        explosion.style.width = '30px';
        explosion.style.height = '30px';
        explosion.style.backgroundColor = '#ffff00';
        explosion.style.borderRadius = '50%';
        explosion.style.transform = 'translate(-50%, -50%)';
        explosion.style.pointerEvents = 'none';
        explosion.style.zIndex = '1000';

        const gameContainer = this.gameEnv.canvasContainer || document.body;
        gameContainer.appendChild(explosion);

        let scale = 1;
        let opacity = 1;
        const animateExplosion = () => {
            scale += 0.2;
            opacity -= 0.05;

            explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
            explosion.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animateExplosion);
            } else {
                gameContainer.removeChild(explosion);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    createSmallExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.style.position = 'absolute';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        explosion.style.width = '20px';
        explosion.style.height = '20px';
        explosion.style.backgroundColor = this.glowColor || '#ff00ff';
        explosion.style.borderRadius = '50%';
        explosion.style.transform = 'translate(-50%, -50%)';
        explosion.style.pointerEvents = 'none';
        explosion.style.zIndex = '1000';

        const gameContainer = this.gameEnv.canvasContainer || document.body;
        gameContainer.appendChild(explosion);

        let scale = 1;
        let opacity = 1;
        const animateExplosion = () => {
            scale += 0.3;
            opacity -= 0.1;

            explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
            explosion.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animateExplosion);
            } else {
                gameContainer.removeChild(explosion);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    createFormationExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '40px';
                explosion.style.height = '40px';
                explosion.style.background = `radial-gradient(circle, #ffd700, #ff6b35, #ff00ff)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 0.5;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.4;
                    opacity -= 0.08;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 100);
        }
    }

    createBossEntrance(x, y) {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '80px';
                explosion.style.height = '80px';
                explosion.style.background = `radial-gradient(circle, #8B0000, #FF0000, #FFD700)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 0.3;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.6;
                    opacity -= 0.06;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 60);
        }
    }

    createFusionExplosion(x, y) {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '50px';
                explosion.style.height = '50px';
                explosion.style.background = `radial-gradient(circle, #ffd700, #ff00ff, #00ffff)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 0.5;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.5;
                    opacity -= 0.08;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 80);
        }
    }

    createUltimateFusionExplosion(x, y) {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '80px';
                explosion.style.height = '80px';
                explosion.style.background = `radial-gradient(circle, #8B0000, #ffd700, #ff00ff, #00ffff)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 0.3;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.7;
                    opacity -= 0.06;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 50);
        }
    }

    createDestructionExplosion(x, y) {
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '60px';
                explosion.style.height = '60px';
                explosion.style.background = `radial-gradient(circle, #ffffff, #ffd700, #ff6b35)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 1;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.5;
                    opacity -= 0.05;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 50);
        }
    }

    createBossDestructionExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.style.position = 'absolute';
                explosion.style.left = x + 'px';
                explosion.style.top = y + 'px';
                explosion.style.width = '100px';
                explosion.style.height = '100px';
                explosion.style.background = `radial-gradient(circle, #FFFFFF, #8B0000, #FF0000)`;
                explosion.style.borderRadius = '50%';
                explosion.style.transform = 'translate(-50%, -50%)';
                explosion.style.pointerEvents = 'none';
                explosion.style.zIndex = '1000';

                const gameContainer = this.gameEnv.canvasContainer || document.body;
                gameContainer.appendChild(explosion);

                let scale = 1;
                let opacity = 1;
                const animateExplosion = () => {
                    scale += 0.7;
                    opacity -= 0.04;

                    explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    explosion.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animateExplosion);
                    } else {
                        gameContainer.removeChild(explosion);
                    }
                };

                requestAnimationFrame(animateExplosion);
            }, i * 40);
        }
    }

    createInterceptorDestroyEffect(x, y) {
        const explosion = document.createElement('div');
        explosion.style.position = 'absolute';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        explosion.style.width = '25px';
        explosion.style.height = '25px';
        explosion.style.background = `radial-gradient(circle, #00BFFF, #FFFFFF)`;
        explosion.style.borderRadius = '50%';
        explosion.style.transform = 'translate(-50%, -50%)';
        explosion.style.pointerEvents = 'none';
        explosion.style.zIndex = '1000';

        const gameContainer = this.gameEnv.canvasContainer || document.body;
        gameContainer.appendChild(explosion);

        let scale = 1;
        let opacity = 1;
        const animateExplosion = () => {
            scale += 0.3;
            opacity -= 0.1;

            explosion.style.transform = `translate(-50%, -50%) scale(${scale})`;
            explosion.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animateExplosion);
            } else {
                gameContainer.removeChild(explosion);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    destroy() {
        const index = this.gameEnv.gameObjects.indexOf(this);
        if (index > -1) {
            this.gameEnv.gameObjects.splice(index, 1);
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        if (super.destroy) {
            super.destroy();
        }
    }
}

export default UnifiedScythe;
