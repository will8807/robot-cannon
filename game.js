// Robot Cannon Game - Kid-Friendly Third Person Shooter
class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'start'; // start, playing, paused, gameOver
        this.lastTime = 0;
        this.frameCount = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false };
        
        // Game stats
        this.score = 0;
        this.startTime = Date.now();
        this.lastBossSpawn = Date.now();
        this.zombiesDefeated = 0;
        
        // Level and XP system
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 100;
        this.levelPhase = 'wave'; // 'wave', 'wave-boss', 'level-boss', 'transition'
        this.currentWave = 1;
        this.wavesPerLevel = 3;
        this.currentMap = 'city';
        this.currentBoss = null;
        this.zombiesInWave = 0;
        this.zombiesKilledInWave = 0;
        
        // Map configurations
        this.maps = {
            city: {
                name: '🏙️ City Streets',
                background: { top: '#87CEEB', middle: '#98FB98', bottom: '#8FBC8F' },
                theme: 'Urban adventure through zombie-infested streets'
            },
            park: {
                name: '🌳 Zombie Park',
                background: { top: '#98FB98', middle: '#90EE90', bottom: '#228B22' },
                theme: 'Peaceful park turned spooky playground'
            },
            space: {
                name: '🚀 Space Station',
                background: { top: '#191970', middle: '#4B0082', bottom: '#2F2F2F' },
                theme: 'Zero gravity zombie mayhem'
            },
            underwater: {
                name: '🌊 Underwater Base',
                background: { top: '#006994', middle: '#0080FF', bottom: '#004080' },
                theme: 'Deep sea zombie adventure'
            },
            desert: {
                name: '🏜️ Desert Outpost',
                background: { top: '#F0E68C', middle: '#DEB887', bottom: '#D2691E' },
                theme: 'Sandy wasteland survival'
            }
        };
        
        // Game objects
        this.player = null;
        this.bullets = [];
        this.zombies = [];
        this.powerUps = [];
        this.particles = [];
        
        // Audio context for simple sound effects
        this.audioContext = null;
        this.initAudio();
        
        this.init();
    }
    
    init() {
        // Get canvas and set up context
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize player
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // Start game loop
        this.gameLoop();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playSound(frequency, duration, type = 'sine') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        const maxWidth = Math.min(1200, window.innerWidth - 40);
        const maxHeight = Math.min(800, window.innerHeight - 140);
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = maxHeight + 'px';
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'p' && this.gameState === 'playing') {
                this.gameState = 'paused';
                document.getElementById('pause-overlay').style.display = 'flex';
            } else if (e.key.toLowerCase() === 'p' && this.gameState === 'paused') {
                this.gameState = 'playing';
                document.getElementById('pause-overlay').style.display = 'none';
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === 'playing') {
                this.mouse.clicked = true;
                this.player.shoot(this.mouse.x, this.mouse.y);
                this.playSound(800, 0.1, 'square'); // Shooting sound
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.clicked = false;
        });
        
        // Button events
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        this.startTime = Date.now();
        this.lastBossSpawn = Date.now();
        
        // Resume audio context if needed
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Start first wave
        setTimeout(() => {
            this.spawnWave();
        }, 1000);
    }
    
    restartGame() {
        // Reset game state
        this.gameState = 'playing';
        this.score = 0;
        this.zombiesDefeated = 0;
        this.startTime = Date.now();
        this.lastBossSpawn = Date.now();
        
        // Reset level system
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 100;
        this.levelPhase = 'wave';
        this.currentWave = 1;
        this.currentMap = 'city';
        this.currentBoss = null;
        this.zombiesInWave = 0;
        this.zombiesKilledInWave = 0;
        
        // Reset player
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // Clear arrays
        this.bullets = [];
        this.zombies = [];
        this.powerUps = [];
        this.particles = [];
        
        // Hide game over screen
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        
        // Start first wave
        setTimeout(() => {
            this.spawnWave();
        }, 1000);
    }
    
    spawnZombie() {
        // Random spawn position on edges
        let x, y;
        const side = Math.floor(Math.random() * 4);
        
        switch (side) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = -50;
                break;
            case 1: // Right
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 50;
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        this.zombies.push(new Zombie(x, y));
    }
    
    spawnBossZombie() {
        let x, y;
        const side = Math.floor(Math.random() * 4);
        
        switch (side) {
            case 0: x = Math.random() * this.canvas.width; y = -50; break;
            case 1: x = this.canvas.width + 50; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 50; break;
            case 3: x = -50; y = Math.random() * this.canvas.height; break;
        }
        
        this.zombies.push(new BossZombie(x, y));
        this.playSound(200, 0.5, 'sawtooth'); // Boss spawn sound
    }
    
    spawnPowerUp() {
        if (Math.random() < 0.002) { // 0.2% chance per frame
            const x = Math.random() * (this.canvas.width - 60) + 30;
            const y = Math.random() * (this.canvas.height - 60) + 30;
            this.powerUps.push(new PowerUp(x, y));
        }
    }
    
    // XP and Level System
    gainExperience(amount) {
        this.experience += amount;
        
        // Create XP particle effect
        this.createParticles(this.player.x, this.player.y - 30, '#FFD700', 3);
        
        // Check for level up
        if (this.experience >= this.experienceToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.experience -= this.experienceToNext;
        this.experienceToNext = Math.floor(this.experienceToNext * 1.3); // Increase XP requirement
        
        // Heal player on level up
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
        
        // Level up effects
        this.createParticles(this.player.x, this.player.y, '#FFD700', 10);
        this.playSound(600, 0.5, 'sine');
    }
    
    checkWaveProgress() {
        // Check wave completion based on current phase
        if (this.levelPhase === 'wave') {
            // Count only regular zombies (not bosses)
            const regularZombies = this.zombies.filter(zombie => !zombie.isWaveBoss && !zombie.isLevelBoss).length;
            const waveProgress = `zombiesInWave=${this.zombiesInWave}, zombiesKilled=${this.zombiesKilledInWave}, regularZombiesAlive=${regularZombies}`;
            
            // Log every 60 frames (about once per second) to avoid spam
            if (this.frameCount % 60 === 0) {
                console.log(`Wave progress: ${waveProgress}, total zombies: ${this.zombies.length}`);
                if (this.zombies.length > 0) {
                    console.log('Zombie types:', this.zombies.map(z => {
                        if (z.isWaveBoss) return 'WaveBoss';
                        if (z.isLevelBoss) return 'LevelBoss';
                        return 'Regular';
                    }));
                }
            }
            
            // SIMPLIFIED CONDITION: If we've killed enough zombies for this wave and no regular zombies remain
            if (this.zombiesInWave > 0 && this.zombiesKilledInWave >= this.zombiesInWave) {
                console.log('Wave kill count reached! Checking for regular zombies...');
                if (regularZombies === 0) {
                    console.log('No regular zombies left! Spawning wave boss...');
                    this.levelPhase = 'wave-boss';
                    this.spawnWaveBoss();
                } else {
                    console.log(`Still ${regularZombies} regular zombies alive, waiting...`);
                }
            }
        } else if (this.levelPhase === 'wave-boss') {
            // Check if wave boss is defeated
            if (this.currentBoss && this.currentBoss.health <= 0) {
                this.currentWave++;
                this.zombiesKilledInWave = 0;
                this.zombiesInWave = 0;
                this.gainExperience(25); // Bonus XP for wave boss
                
                if (this.currentWave > this.wavesPerLevel) {
                    // Time for level boss
                    this.levelPhase = 'level-boss';
                    this.spawnLevelBoss();
                } else {
                    // Start next wave
                    this.levelPhase = 'wave';
                    setTimeout(() => {
                        this.spawnWave();
                    }, 2000);
                }
            }
        } else if (this.levelPhase === 'level-boss') {
            // Check if level boss is defeated
            if (this.currentBoss && this.currentBoss.health <= 0) {
                this.gainExperience(100); // Big bonus XP for level boss
                this.levelPhase = 'transition';
                
                // Advance to next level and map
                setTimeout(() => {
                    this.advanceToNextLevel();
                }, 2000);
            }
        }
    }
    
    spawnWave() {
        // Calculate zombies for this wave
        this.zombiesInWave = Math.min(4 + this.level + this.currentWave, 12);
        this.zombiesKilledInWave = 0;
        
        console.log(`Spawning wave ${this.currentWave} with ${this.zombiesInWave} zombies, level phase: ${this.levelPhase}`);
        
        // Spawn zombies with staggered timing
        for (let i = 0; i < this.zombiesInWave; i++) {
            setTimeout(() => {
                if (this.levelPhase === 'wave') { // Only spawn if still in wave phase
                    console.log(`Spawning zombie ${i + 1}/${this.zombiesInWave}`);
                    this.spawnZombie();
                } else {
                    console.log(`Skipping zombie spawn ${i + 1}, phase is now: ${this.levelPhase}`);
                }
            }, i * 800); // Spawn every 800ms
        }
    }
    
    spawnWaveBoss() {
        // Spawn wave boss closer to center but not too close to player
        let x, y;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Find a position that's on-screen but not too close to player
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 200; // 150-350 pixels from center
            x = centerX + Math.cos(angle) * distance;
            y = centerY + Math.sin(angle) * distance;
            
            // Keep within screen bounds with some margin
            x = Math.max(50, Math.min(this.canvas.width - 50, x));
            y = Math.max(50, Math.min(this.canvas.height - 50, y));
            
            attempts++;
        } while (attempts < 10 && Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2) < 100);
        
        console.log(`Spawning wave boss at (${Math.round(x)}, ${Math.round(y)}) - canvas size: ${this.canvas.width}x${this.canvas.height}`);
        
        this.currentBoss = new BossZombie(x, y);
        // Wave bosses are smaller/weaker than level bosses
        this.currentBoss.health = 60 + (this.level * 10);
        this.currentBoss.maxHealth = this.currentBoss.health;
        this.currentBoss.radius = 30; // Slightly smaller
        this.currentBoss.isWaveBoss = true;
        
        this.zombies.push(this.currentBoss);
        this.playSound(180, 0.7, 'sawtooth'); // Wave boss sound
    }
    
    spawnLevelBoss() {
        // Clear any remaining zombies
        this.zombies = [];
        
        // Spawn level boss closer to center but not too close to player
        let x, y;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Find a position that's on-screen but not too close to player
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 250; // 200-450 pixels from center
            x = centerX + Math.cos(angle) * distance;
            y = centerY + Math.sin(angle) * distance;
            
            // Keep within screen bounds with some margin
            x = Math.max(60, Math.min(this.canvas.width - 60, x));
            y = Math.max(60, Math.min(this.canvas.height - 60, y));
            
            attempts++;
        } while (attempts < 10 && Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2) < 120);
        
        console.log(`Spawning level boss at (${Math.round(x)}, ${Math.round(y)}) - canvas size: ${this.canvas.width}x${this.canvas.height}`);
        
        this.currentBoss = new BossZombie(x, y);
        // Level bosses are much stronger
        this.currentBoss.health = 150 + (this.level * 30);
        this.currentBoss.maxHealth = this.currentBoss.health;
        this.currentBoss.radius = 40; // Larger than wave bosses
        this.currentBoss.damage = 30 + (this.level * 5);
        this.currentBoss.isLevelBoss = true;
        
        this.zombies.push(this.currentBoss);
        this.playSound(120, 1.2, 'sawtooth'); // Deep level boss sound
    }
    
    advanceToNextLevel() {
        // Change map first
        const mapNames = Object.keys(this.maps);
        const currentIndex = mapNames.indexOf(this.currentMap);
        const nextIndex = (currentIndex + 1) % mapNames.length;
        this.currentMap = mapNames[nextIndex];
        
        // Reset wave state
        this.currentWave = 1;
        this.levelPhase = 'wave';
        this.zombiesKilledInWave = 0;
        this.zombiesInWave = 0;
        
        // Show transition and start new level
        this.showMapTransition();
    }
    
    showMapTransition() {
        // Show transition screen
        const transitionDiv = document.getElementById('level-transition');
        
        document.getElementById('transition-title').textContent = '🎉 LEVEL COMPLETE!';
        document.getElementById('transition-map').textContent = `Now entering: ${this.maps[this.currentMap].name}`;
        
        transitionDiv.style.display = 'flex';
        
        setTimeout(() => {
            transitionDiv.style.display = 'none';
            this.levelPhase = 'wave';
            // Start the first wave of the new map
            this.spawnWave();
        }, 3000);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.frameCount++;
        
        // Update player
        this.player.update(this.keys, deltaTime, this.canvas.width, this.canvas.height);
        
        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.update(deltaTime);
            
            // Remove bullets that are off screen
            if (bullet.x < 0 || bullet.x > this.canvas.width || 
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(index, 1);
            }
        });
        
        // Update zombies
        this.zombies.forEach((zombie, index) => {
            if (zombie instanceof BossZombie) {
                zombie.update(deltaTime, this.player, this.canvas);
                
                // Check boss projectile collisions with player
                zombie.projectiles.forEach((projectile, projIndex) => {
                    if (this.checkCollision(projectile, this.player)) {
                        if (this.player.takeDamage(projectile.damage)) {
                            this.playSound(150, 0.3, 'sawtooth'); // Damage sound
                            
                            // Create damage particles
                            this.createParticles(this.player.x, this.player.y, '#ff6b6b', 5);
                            
                            if (this.player.health <= 0) {
                                this.gameOver();
                            }
                        }
                        // Remove projectile after hit
                        zombie.projectiles.splice(projIndex, 1);
                    }
                });
            } else {
                zombie.update(this.player.x, this.player.y, deltaTime);
            }
            
            // Check collision with player
            if (this.checkCollision(zombie, this.player)) {
                if (this.player.takeDamage(zombie.damage)) {
                    this.playSound(150, 0.3, 'sawtooth'); // Damage sound
                    
                    // Create damage particles
                    this.createParticles(this.player.x, this.player.y, '#ff6b6b', 5);
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
            }
        });
        
        // Update power-ups
        this.powerUps.forEach((powerUp, index) => {
            powerUp.update(deltaTime);
            
            // Check collision with player
            if (this.checkCollision(powerUp, this.player)) {
                powerUp.applyEffect(this.player);
                this.powerUps.splice(index, 1);
                this.playSound(600, 0.3, 'sine'); // Power-up sound
                
                // Create pickup particles
                this.createParticles(powerUp.x, powerUp.y, powerUp.color, 8);
            }
        });
        
        // Check bullet-zombie collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.zombies.forEach((zombie, zombieIndex) => {
                if (this.checkCollision(bullet, zombie)) {
                    // Damage zombie
                    zombie.takeDamage(bullet.damage);
                    
                    // Remove bullet
                    this.bullets.splice(bulletIndex, 1);
                    
                    // Create hit particles
                    this.createParticles(zombie.x, zombie.y, '#4ecdc4', 3);
                    
                    // Remove zombie if dead
                    if (zombie.health <= 0) {
                        this.score += zombie.points;
                        this.zombiesDefeated++;
                        
                        // Track wave progress
                        if (this.levelPhase === 'wave' && !zombie.isWaveBoss && !zombie.isLevelBoss) {
                            this.zombiesKilledInWave++;
                            console.log(`Regular zombie killed! Progress: ${this.zombiesKilledInWave}/${this.zombiesInWave}`);
                        }
                        
                        // Give XP based on zombie type
                        let xpGain = 10;
                        if (zombie.isWaveBoss) {
                            xpGain = 25;
                        } else if (zombie.isLevelBoss) {
                            xpGain = 50;
                        }
                        this.gainExperience(xpGain);
                        
                        this.zombies.splice(zombieIndex, 1);
                        
                        // Death particles
                        this.createParticles(zombie.x, zombie.y, '#98FB98', 6);
                        this.playSound(300, 0.2, 'square'); // Zombie death sound
                    }
                }
            });
            
            // Check bullet-boss projectile collisions (bullets can destroy projectiles)
            this.zombies.forEach(zombie => {
                if (zombie instanceof BossZombie && bulletIndex < this.bullets.length) {
                    zombie.projectiles.forEach((projectile, projIndex) => {
                        if (this.checkCollision(this.bullets[bulletIndex], projectile)) {
                            // Remove both bullet and projectile
                            this.bullets.splice(bulletIndex, 1);
                            zombie.projectiles.splice(projIndex, 1);
                            
                            // Create hit particles
                            this.createParticles(projectile.x, projectile.y, projectile.color, 3);
                            this.playSound(400, 0.2, 'sine'); // Projectile destroyed sound
                        }
                    });
                }
            });
        });
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update(deltaTime);
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        
        // Check wave and level progress
        this.checkWaveProgress();
        
        // No random spawning - waves are controlled by checkWaveProgress
        
        // Spawn power-ups
        this.spawnPowerUp();
        
        // Update UI
        this.updateUI();
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    
    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.radius + obj2.radius);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('current-map').textContent = this.maps[this.currentMap].name;
        
        // Update XP display with numbers
        document.getElementById('xp-display').textContent = `${this.experience} / ${this.experienceToNext}`;
        
        // Update wave display
        document.getElementById('wave-display').textContent = `${this.currentWave} / ${this.wavesPerLevel}`;
        
        // Update health bar
        document.getElementById('health-fill').style.width = (this.player.health / this.player.maxHealth * 100) + '%';
        
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('game-over-screen').style.display = 'block';
        
        // Update final stats
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('zombies-defeated').textContent = this.zombiesDefeated;
        
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('survival-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    render() {
        // Clear canvas with current map's gradient background
        const mapConfig = this.maps[this.currentMap];
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, mapConfig.background.top);
        gradient.addColorStop(0.7, mapConfig.background.middle);
        gradient.addColorStop(1, mapConfig.background.bottom);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map-specific atmospheric effects
        this.drawMapEffects();
        
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // Draw all game objects
            this.particles.forEach(particle => particle.draw(this.ctx));
            this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
            this.bullets.forEach(bullet => bullet.draw(this.ctx));
            this.zombies.forEach(zombie => zombie.draw(this.ctx));
            this.player.draw(this.ctx, this.mouse.x, this.mouse.y);
            
            // Draw level-specific UI
            this.drawLevelUI();
        }
    }
    
    drawMapEffects() {
        const time = Date.now() * 0.0001;
        
        switch (this.currentMap) {
            case 'city':
                this.drawClouds();
                break;
            case 'park':
                this.drawTrees();
                break;
            case 'space':
                this.drawStars();
                break;
            case 'underwater':
                this.drawBubbles();
                break;
            case 'desert':
                this.drawSandDunes();
                break;
        }
    }
    
    drawClouds() {
        const time = Date.now() * 0.0001;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        for (let i = 0; i < 3; i++) {
            const x = (time * 20 + i * 200) % (this.canvas.width + 100) - 50;
            const y = 50 + i * 30;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 30, 0, Math.PI * 2);
            this.ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
            this.ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawTrees() {
        // Simple tree silhouettes for park
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
        for (let i = 0; i < 4; i++) {
            const x = (i * 300) % this.canvas.width;
            const y = this.canvas.height - 80;
            
            // Tree trunk
            this.ctx.fillRect(x - 5, y, 10, 40);
            // Tree top
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawStars() {
        // Twinkling stars for space
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < 20; i++) {
            const x = (i * 73) % this.canvas.width;
            const y = (i * 47) % (this.canvas.height / 2);
            const twinkle = 0.5 + 0.5 * Math.sin(time + i);
            
            this.ctx.globalAlpha = twinkle;
            this.ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawBubbles() {
        // Floating bubbles for underwater
        const time = Date.now() * 0.0005;
        this.ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 8; i++) {
            const x = (i * 150 + time * 30) % (this.canvas.width + 50);
            const y = this.canvas.height - ((time * 50 + i * 100) % (this.canvas.height + 100));
            const size = 10 + (i % 3) * 5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    drawSandDunes() {
        // Sand dunes for desert
        this.ctx.fillStyle = 'rgba(210, 180, 140, 0.4)';
        const time = Date.now() * 0.00005;
        
        for (let i = 0; i < 3; i++) {
            const x = (time * 10 + i * 400) % (this.canvas.width + 200) - 100;
            const y = this.canvas.height - 60 - i * 20;
            
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 80, 30, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawLevelUI() {
        // Show current phase
        let phaseText = '';
        let phaseColor = '#FFD700';
        
        switch (this.levelPhase) {
            case 'wave':
                if (this.zombiesInWave > 0) {
                    const remaining = this.zombiesInWave - this.zombiesKilledInWave;
                    phaseText = `Wave ${this.currentWave}: ${remaining} zombies left`;
                } else {
                    phaseText = `Wave ${this.currentWave}`;
                }
                phaseColor = '#4ecdc4';
                break;
            case 'wave-boss':
                phaseText = `Wave ${this.currentWave - 1} Boss!`;
                phaseColor = '#ffa726';
                break;
            case 'level-boss':
                phaseText = 'LEVEL BOSS FIGHT!';
                phaseColor = '#ff6b6b';
                break;
            case 'transition':
                phaseText = 'LEVEL COMPLETE!';
                phaseColor = '#FFD700';
                break;
        }
        
        if (phaseText) {
            this.ctx.font = 'bold 24px Nunito';
            this.ctx.fillStyle = phaseColor;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.textAlign = 'center';
            
            this.ctx.strokeText(phaseText, this.canvas.width / 2, 50);
            this.ctx.fillText(phaseText, this.canvas.width / 2, 50);
            
            this.ctx.textAlign = 'left';
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Player class - Robot with cannon arm
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.speed = 200; // pixels per second
        this.health = 100;
        this.maxHealth = 100;
        this.lastShot = 0;
        this.shootCooldown = 200; // milliseconds
        
        // Power-up effects
        this.speedBoost = 1;
        this.damageBoost = 1;
        this.healthRegen = 0;
        this.powerUpTimer = 0;
        this.cannonType = 'normal'; // normal, power, rapid, explosive
        
        // Damage immunity
        this.lastDamageTime = 0;
        this.damageImmunityDuration = 1000; // 1 second immunity
    }
    
    update(keys, deltaTime, canvasWidth, canvasHeight) {
        const speed = this.speed * this.speedBoost * (deltaTime / 1000);
        
        // Movement
        if (keys['w'] || keys['arrowup']) this.y -= speed;
        if (keys['s'] || keys['arrowdown']) this.y += speed;
        if (keys['a'] || keys['arrowleft']) this.x -= speed;
        if (keys['d'] || keys['arrowright']) this.x += speed;
        
        // Keep player in bounds
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        
        // Power-up timer
        if (this.powerUpTimer > 0) {
            this.powerUpTimer -= deltaTime;
            if (this.powerUpTimer <= 0) {
                this.speedBoost = 1;
                this.damageBoost = 1;
                this.healthRegen = 0;
                this.cannonType = 'normal';
                this.shootCooldown = 200; // Reset to normal
            }
        }
        
        // Health regeneration
        if (this.healthRegen > 0 && this.health < this.maxHealth) {
            this.health += this.healthRegen * (deltaTime / 1000);
            this.health = Math.min(this.maxHealth, this.health);
        }
        
        // Update damage immunity
        const currentTime = Date.now();
        this.isImmune = (currentTime - this.lastDamageTime) < this.damageImmunityDuration;
    }
    
    shoot(targetX, targetY) {
        const currentTime = Date.now();
        if (currentTime - this.lastShot < this.shootCooldown) return;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const bullet = new Bullet(
                this.x + (dx / distance) * 30, // Start bullet from cannon
                this.y + (dy / distance) * 30,
                dx / distance,
                dy / distance,
                10 * this.damageBoost
            );
            
            game.bullets.push(bullet);
            this.lastShot = currentTime;
        }
    }
    
    takeDamage(damage) {
        const currentTime = Date.now();
        if (currentTime - this.lastDamageTime >= this.damageImmunityDuration) {
            this.health -= damage;
            this.health = Math.max(0, this.health);
            this.lastDamageTime = currentTime;
            return true; // Damage was applied
        }
        return false; // Damage was blocked by immunity
    }
    
    draw(ctx, mouseX, mouseY) {
        // Calculate cannon angle
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const angle = Math.atan2(dy, dx);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw robot body (main circle)
        ctx.fillStyle = '#4ecdc4';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw robot details
        ctx.fillStyle = '#2c3e50';
        
        // Eyes
        ctx.beginPath();
        ctx.arc(-8, -10, 4, 0, Math.PI * 2);
        ctx.arc(8, -10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw cannon arm with variant-specific appearance
        ctx.rotate(angle);
        
        // Set cannon colors and effects based on type
        let armColor = '#ff6b6b';
        let barrelColor = '#2c3e50';
        let hasGlow = false;
        let glowColor = '';
        
        switch (this.cannonType) {
            case 'power':
                armColor = '#ff4444';
                barrelColor = '#8B0000';
                hasGlow = true;
                glowColor = '#ff0000';
                break;
            case 'rapid':
                armColor = '#ff8c00';
                barrelColor = '#ff6600';
                hasGlow = true;
                glowColor = '#ffa500';
                break;
            case 'explosive':
                armColor = '#8a2be2';
                barrelColor = '#4b0082';
                hasGlow = true;
                glowColor = '#9966cc';
                break;
            default: // normal
                armColor = '#ff6b6b';
                barrelColor = '#2c3e50';
                break;
        }
        
        // Add glow effect for powered cannons
        if (hasGlow) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8;
        }
        
        // Draw cannon arm
        ctx.fillStyle = armColor;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        
        if (this.cannonType === 'rapid') {
            // Sleeker, elongated cannon for rapid fire
            ctx.fillRect(this.radius - 5, -6, 40, 12);
            ctx.strokeRect(this.radius - 5, -6, 40, 12);
        } else if (this.cannonType === 'explosive') {
            // Bulkier cannon for explosive rounds
            ctx.fillRect(this.radius - 5, -10, 30, 20);
            ctx.strokeRect(this.radius - 5, -10, 30, 20);
        } else if (this.cannonType === 'power') {
            // Enhanced cannon with additional details
            ctx.fillRect(this.radius - 5, -8, 35, 16);
            ctx.strokeRect(this.radius - 5, -8, 35, 16);
            // Power lines
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.radius - 2, -5);
            ctx.lineTo(this.radius + 25, -5);
            ctx.moveTo(this.radius - 2, 5);
            ctx.lineTo(this.radius + 25, 5);
            ctx.stroke();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 3;
        } else {
            // Normal cannon
            ctx.fillRect(this.radius - 5, -8, 35, 16);
            ctx.strokeRect(this.radius - 5, -8, 35, 16);
        }
        
        // Draw cannon barrel with type-specific appearance
        ctx.fillStyle = barrelColor;
        
        if (this.cannonType === 'rapid') {
            // Multiple smaller barrels for rapid fire
            ctx.fillRect(this.radius + 35, -4, 12, 3);
            ctx.fillRect(this.radius + 35, 1, 12, 3);
            ctx.strokeRect(this.radius + 35, -4, 12, 3);
            ctx.strokeRect(this.radius + 35, 1, 12, 3);
        } else if (this.cannonType === 'explosive') {
            // Wider barrel for explosive rounds
            ctx.fillRect(this.radius + 20, -8, 20, 16);
            ctx.strokeRect(this.radius + 20, -8, 20, 16);
        } else if (this.cannonType === 'power') {
            // Enhanced barrel with energy ring
            ctx.fillRect(this.radius + 25, -5, 18, 10);
            ctx.strokeRect(this.radius + 25, -5, 18, 10);
            // Energy ring
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.radius + 34, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Normal barrel
            ctx.fillRect(this.radius + 25, -5, 15, 10);
            ctx.strokeRect(this.radius + 25, -5, 15, 10);
        }
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Power-up visual effect
        if (this.powerUpTimer > 0) {
            ctx.strokeStyle = '#ffa726';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Damage immunity visual effect
        if (this.isImmune) {
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() * 0.01); // Flashing effect
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, dx, dy, damage) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.speed = 500;
        this.radius = 4;
        this.damage = damage;
    }
    
    update(deltaTime) {
        const speed = this.speed * (deltaTime / 1000);
        this.x += this.dx * speed;
        this.y += this.dy * speed;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#ffa726';
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

// Zombie class
class Zombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 50;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.points = 10;
        this.color = '#7D8471'; // Darker, spookier green
    }
    
    update(playerX, playerY, deltaTime) {
        // Move towards player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = this.speed * (deltaTime / 1000);
            this.x += (dx / distance) * speed;
            this.y += (dy / distance) * speed;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    draw(ctx) {
        // Add subtle glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        
        // Draw zombie body with tattered edges
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Irregular zombie shape
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const variation = this.radius + Math.sin(i * 2) * 3;
            const x = this.x + Math.cos(angle) * variation;
            const y = this.y + Math.sin(angle) * variation;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw glowing red eyes
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y - 12, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 8, this.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y - 12, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 8, this.y - 12, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Jagged mouth with teeth
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - 10, this.y + 5);
        ctx.lineTo(this.x - 7, this.y + 8);
        ctx.lineTo(this.x - 4, this.y + 5);
        ctx.lineTo(this.x - 1, this.y + 9);
        ctx.lineTo(this.x + 2, this.y + 5);
        ctx.lineTo(this.x + 5, this.y + 8);
        ctx.lineTo(this.x + 8, this.y + 5);
        ctx.lineTo(this.x + 10, this.y + 7);
        ctx.stroke();
        
        // White teeth
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.x - 6, this.y + 6);
        ctx.lineTo(this.x - 4, this.y + 5);
        ctx.lineTo(this.x - 2, this.y + 6);
        ctx.closePath();
        ctx.moveTo(this.x + 2, this.y + 6);
        ctx.lineTo(this.x + 4, this.y + 5);
        ctx.lineTo(this.x + 6, this.y + 6);
        ctx.closePath();
        ctx.fill();
        
        // Health bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(this.x - 15, this.y - 35, 30, 4);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.fillRect(this.x - 15, this.y - 35, 30 * (this.health / this.maxHealth), 4);
        }
    }
}

// Boss Zombie class
class BossZombie extends Zombie {
    constructor(x, y) {
        super(x, y);
        this.radius = 35;
        this.speed = 80;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 25;
        this.points = 50;
        
        // Special ability properties
        this.lastAbilityTime = 0;
        this.abilityPause = false;
        this.abilityPauseTime = 0;
        this.teleportCooldown = 3000; // 3 seconds
        this.shootCooldown = 2000; // 2 seconds
        this.chargeCooldown = 4000; // 4 seconds
        this.poisonCooldown = 2500; // 2.5 seconds
        this.projectiles = [];
        
        // Generate random boss variant
        this.variant = Math.floor(Math.random() * 4); // 4 different types
        
        // Set appearance based on variant
        switch (this.variant) {
            case 0: // Fire Boss
                this.color = '#8B0000';
                this.crownColor = '#ffa726';
                this.eyeColor = '#ff4444';
                this.name = 'Fire Boss';
                break;
            case 1: // Ice Boss
                this.color = '#4682B4';
                this.crownColor = '#87CEEB';
                this.eyeColor = '#00FFFF';
                this.name = 'Ice Boss';
                break;
            case 2: // Shadow Boss
                this.color = '#2F2F2F';
                this.crownColor = '#800080';
                this.eyeColor = '#9400D3';
                this.name = 'Shadow Boss';
                break;
            case 3: // Poison Boss
                this.color = '#556B2F';
                this.crownColor = '#32CD32';
                this.eyeColor = '#ADFF2F';
                this.name = 'Poison Boss';
                break;
        }
    }
    
    draw(ctx) {
        // Add variant-specific glow effects
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        // Add special effects based on variant
        if (this.variant === 0) { // Fire Boss - flickering effect
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.01) * 5;
        } else if (this.variant === 1) { // Ice Boss - crystal effect
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 12;
        } else if (this.variant === 2) { // Shadow Boss - dark pulsing
            ctx.shadowColor = '#9400D3';
            ctx.shadowBlur = 25 + Math.sin(Date.now() * 0.008) * 8;
        } else if (this.variant === 3) { // Poison Boss - toxic glow
            ctx.shadowColor = '#32CD32';
            ctx.shadowBlur = 18 + Math.sin(Date.now() * 0.012) * 7;
        }
        
        // Draw larger zombie body with variant-specific shape
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        // Different shapes for different variants
        const spikes = this.variant === 1 ? 6 : 12; // Ice boss has fewer, sharper spikes
        const shapeMultiplier = this.variant === 2 ? 4 : 3; // Shadow boss is more irregular
        
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const variation = this.radius + Math.sin(i * shapeMultiplier) * (this.variant === 1 ? 8 : 6);
            const x = this.x + Math.cos(angle) * variation;
            const y = this.y + Math.sin(angle) * variation;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Variant-specific crown design
        ctx.fillStyle = this.crownColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        if (this.variant === 0) { // Fire Boss - flame-like crown
            ctx.fillRect(this.x - 20, this.y - 45, 40, 15);
            ctx.strokeRect(this.x - 20, this.y - 45, 40, 15);
            // Flame spikes
            ctx.fillRect(this.x - 15, this.y - 50, 6, 12);
            ctx.fillRect(this.x - 5, this.y - 55, 8, 18);
            ctx.fillRect(this.x + 5, this.y - 52, 7, 15);
            ctx.fillRect(this.x + 15, this.y - 48, 5, 10);
        } else if (this.variant === 1) { // Ice Boss - crystal crown
            ctx.fillRect(this.x - 18, this.y - 45, 36, 12);
            ctx.strokeRect(this.x - 18, this.y - 45, 36, 12);
            // Crystal spikes
            ctx.beginPath();
            ctx.moveTo(this.x - 12, this.y - 45);
            ctx.lineTo(this.x - 8, this.y - 55);
            ctx.lineTo(this.x - 4, this.y - 45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + 4, this.y - 45);
            ctx.lineTo(this.x + 8, this.y - 52);
            ctx.lineTo(this.x + 12, this.y - 45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.variant === 2) { // Shadow Boss - dark crown with horns
            ctx.fillRect(this.x - 22, this.y - 45, 44, 18);
            ctx.strokeRect(this.x - 22, this.y - 45, 44, 18);
            // Horn-like spikes
            ctx.beginPath();
            ctx.moveTo(this.x - 15, this.y - 45);
            ctx.lineTo(this.x - 10, this.y - 58);
            ctx.lineTo(this.x - 5, this.y - 45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y - 45);
            ctx.lineTo(this.x + 10, this.y - 58);
            ctx.lineTo(this.x + 15, this.y - 45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else { // Poison Boss - organic crown
            ctx.fillRect(this.x - 20, this.y - 45, 40, 15);
            ctx.strokeRect(this.x - 20, this.y - 45, 40, 15);
            // Organic bulbous spikes
            ctx.beginPath();
            ctx.arc(this.x - 10, this.y - 50, 4, 0, Math.PI * 2);
            ctx.arc(this.x, this.y - 55, 6, 0, Math.PI * 2);
            ctx.arc(this.x + 10, this.y - 48, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Variant-specific glowing eyes
        ctx.fillStyle = this.eyeColor;
        ctx.shadowColor = this.eyeColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y - 15, 8, 0, Math.PI * 2);
        ctx.arc(this.x + 12, this.y - 15, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y - 15, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 12, this.y - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Large jagged mouth with prominent teeth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x - 18, this.y + 8);
        ctx.lineTo(this.x - 12, this.y + 12);
        ctx.lineTo(this.x - 6, this.y + 8);
        ctx.lineTo(this.x, this.y + 14);
        ctx.lineTo(this.x + 6, this.y + 8);
        ctx.lineTo(this.x + 12, this.y + 12);
        ctx.lineTo(this.x + 18, this.y + 8);
        ctx.stroke();
        
        // Large white fangs
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Left fang
        ctx.moveTo(this.x - 8, this.y + 9);
        ctx.lineTo(this.x - 4, this.y + 6);
        ctx.lineTo(this.x - 2, this.y + 9);
        ctx.closePath();
        // Right fang
        ctx.moveTo(this.x + 2, this.y + 9);
        ctx.lineTo(this.x + 4, this.y + 6);
        ctx.lineTo(this.x + 8, this.y + 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Health bar
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(this.x - 25, this.y - 50, 50, 6);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(this.x - 25, this.y - 50, 50 * (this.health / this.maxHealth), 6);
        
        // Draw projectiles
        this.projectiles.forEach(projectile => {
            ctx.fillStyle = projectile.color;
            ctx.shadowColor = projectile.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }
    
    update(deltaTime, player, canvas) {
        // Handle ability pause (when teleporting or charging)
        if (this.abilityPause) {
            this.abilityPauseTime -= deltaTime;
            if (this.abilityPauseTime <= 0) {
                this.abilityPause = false;
            }
            return; // Don't move during ability pause
        }
        
        // Call parent update for normal movement with correct parameters
        super.update(player.x, player.y, deltaTime);
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.x += projectile.vx * deltaTime / 1000;
            projectile.y += projectile.vy * deltaTime / 1000;
            projectile.life -= deltaTime;
            
            // Remove if expired or off screen
            return projectile.life > 0 && 
                   projectile.x > -50 && projectile.x < canvas.width + 50 &&
                   projectile.y > -50 && projectile.y < canvas.height + 50;
        });
        
        // Use special abilities based on variant
        const currentTime = Date.now();
        const timeSinceLastAbility = currentTime - this.lastAbilityTime;
        
        switch (this.variant) {
            case 0: // Fire Boss - Shoots fireballs
                if (timeSinceLastAbility >= this.shootCooldown) {
                    this.shootFireball(player);
                    this.lastAbilityTime = currentTime;
                }
                break;
            case 1: // Ice Boss - Teleports near player
                if (timeSinceLastAbility >= this.teleportCooldown) {
                    this.teleportNearPlayer(player, canvas);
                    this.lastAbilityTime = currentTime;
                }
                break;
            case 2: // Shadow Boss - Charges at player
                if (timeSinceLastAbility >= this.chargeCooldown) {
                    this.chargeAtPlayer(player);
                    this.lastAbilityTime = currentTime;
                }
                break;
            case 3: // Poison Boss - Shoots poison clouds
                if (timeSinceLastAbility >= this.poisonCooldown) {
                    this.shootPoisonCloud(player);
                    this.lastAbilityTime = currentTime;
                }
                break;
        }
    }
    
    shootFireball(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const speed = 300;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;
        
        this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: vx,
            vy: vy,
            radius: 8,
            color: '#FF4500',
            life: 3000,
            damage: 20
        });
    }
    
    teleportNearPlayer(player, canvas) {
        // Teleport to a position near the player but not too close
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 100; // 100-200 pixels away
        
        let newX = player.x + Math.cos(angle) * distance;
        let newY = player.y + Math.sin(angle) * distance;
        
        // Keep within canvas bounds
        newX = Math.max(this.radius, Math.min(canvas.width - this.radius, newX));
        newY = Math.max(this.radius, Math.min(canvas.height - this.radius, newY));
        
        this.x = newX;
        this.y = newY;
        
        // Brief pause after teleport
        this.abilityPause = true;
        this.abilityPauseTime = 500;
    }
    
    chargeAtPlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Store original speed and increase it for charge
        this.originalSpeed = this.speed;
        this.speed = 200; // Much faster during charge
        
        // Set charge duration
        this.abilityPause = true;
        this.abilityPauseTime = 1500; // 1.5 second charge
        
        // Reset speed after charge
        setTimeout(() => {
            if (this.originalSpeed) {
                this.speed = this.originalSpeed;
                delete this.originalSpeed;
            }
        }, 1500);
    }
    
    shootPoisonCloud(player) {
        // Shoot multiple poison projectiles in a spread
        for (let i = 0; i < 3; i++) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const spreadAngle = (i - 1) * 0.3; // -0.3, 0, 0.3 radians spread
            const baseAngle = Math.atan2(dy, dx);
            const finalAngle = baseAngle + spreadAngle;
            
            const speed = 200;
            const vx = Math.cos(finalAngle) * speed;
            const vy = Math.sin(finalAngle) * speed;
            
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: vx,
                vy: vy,
                radius: 6,
                color: '#32CD32',
                life: 4000,
                damage: 15
            });
        }
    }
}

// Power-up class
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.rotation = 0;
        this.bobOffset = 0;
        
        // Random power-up type
        const types = ['speed', 'damage', 'health', 'rapid-fire', 'explosive'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        switch (this.type) {
            case 'speed':
                this.color = '#4ecdc4';
                this.symbol = '⚡';
                break;
            case 'damage':
                this.color = '#ff6b6b';
                this.symbol = '💥';
                break;
            case 'health':
                this.color = '#98FB98';
                this.symbol = '❤️';
                break;
            case 'rapid-fire':
                this.color = '#ffa726';
                this.symbol = '🔥';
                break;
            case 'explosive':
                this.color = '#9966cc';
                this.symbol = '💣';
                break;
        }
    }
    
    update(deltaTime) {
        this.rotation += deltaTime * 0.002;
        this.bobOffset = Math.sin(Date.now() * 0.003) * 5;
    }
    
    applyEffect(player) {
        switch (this.type) {
            case 'speed':
                player.speedBoost = 1.5;
                player.powerUpTimer = 5000; // 5 seconds
                break;
            case 'damage':
                player.damageBoost = 2;
                player.cannonType = 'power';
                player.powerUpTimer = 5000;
                break;
            case 'health':
                player.health = Math.min(player.maxHealth, player.health + 30);
                break;
            case 'rapid-fire':
                player.shootCooldown = 100; // Faster shooting
                player.cannonType = 'rapid';
                player.powerUpTimer = 5000;
                break;
            case 'explosive':
                player.damageBoost = 1.5;
                player.cannonType = 'explosive';
                player.powerUpTimer = 5000;
                break;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + this.bobOffset);
        ctx.rotate(this.rotation);
        
        // Glowing effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Power-up body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        // Symbol
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.symbol, this.x, this.y + this.bobOffset + 7);
    }
}

// Particle class for visual effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1000; // milliseconds
        this.maxLife = 1000;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }
    
    update(deltaTime) {
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
        this.life -= deltaTime;
        
        // Fade out
        this.vx *= 0.98;
        this.vy *= 0.98;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});