const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const currentScoreEl = document.getElementById('currentScore');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let gameSpeed = 2;

// Power-up system
let activePowerUps = {
    phaser: { active: false, duration: 0, maxDuration: 240 },
    timeSlow: { active: false, duration: 0, maxDuration: 300 } // 5 seconds
};

// Phaser trail effect
let phaserTrail = [];
let phaserParticles = [];

// Gems array and collection tracking
let gems = [];
const gemSize = 16;
let phaserGemsCollected = 0; // Track phaser gems collected
const phaserGemsRequired = 3; // Need 3 gems to activate phaser
let timeSlowGemsCollected = 0; // Track time slow gems collected
const timeSlowGemsRequired = 3; // Need 3 gems to activate time slow

// Player object
const player = {
    x: 80,
    y: 300,
    width: 24,
    height: 24,
    velocity: 0,
    jump: -8,
    gravity: 0.5,
    color: '#b2795c',
    hitPoints: 1,
    maxHitPoints: 1,
    invulnerable: false,
    invulnerabilityTimer: 0
};

// Obstacles array
let obstacles = [];
const obstacleWidth = 50;
const obstacleGap = 150;
let obstacleSpacing = 200; // Base spacing - will be dynamic

// Particle effects
let particles = [];

// Audio context for sound effects
let audioContext;
let soundEnabled = true;

// Touch handling
let touchStarted = false;

// Calculate dynamic obstacle spacing based on game speed
function getObstacleSpacing() {
    // Increase spacing as game speed increases, with extra spacing for moving obstacles
    const baseSpacing = 200;
    const speedMultiplier = gameSpeed / 2; // How much faster than initial speed
    const extraSpacing = Math.max(0, (speedMultiplier - 1) * 50); // Extra space for faster speeds
    
    // Add even more spacing when moving obstacles are present (score >= 40)
    const movingObstacleBonus = score >= 40 ? 80 : 0;
    
    return baseSpacing + extraSpacing + movingObstacleBonus;
}

// Initialize audio context
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API is not supported in this browser');
        soundEnabled = false;
    }
}

// Play jump sound
function playJumpSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Play gem collection sound
function playGemSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

// Play score sound
function playScoreSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Play game over sound
function playGameOverSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Play power-up lost sound
function playPowerUpLostSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Create phaser effect particles around player
function createPhaserTrail() {
    if (!activePowerUps.phaser.active) return;
    
    // Add current player position to trail
    phaserTrail.push({
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        life: 20, // Trail segment life
        maxLife: 20
    });
    
    // Limit trail length
    if (phaserTrail.length > 15) {
        phaserTrail.shift();
    }
}

// Initialize game
function init() {
    obstacles = [];
    gems = [];
    particles = [];
    phaserParticles = [];
    phaserTrail = [];
    player.y = 300;
    player.velocity = 0;
    player.hitPoints = player.maxHitPoints;
    player.invulnerable = false;
    player.invulnerabilityTimer = 0;
    score = 0;
    gameSpeed = 2;
    phaserGemsCollected = 0;
    timeSlowGemsCollected = 0;
    
    // Reset power-up state
    activePowerUps.phaser.active = false;
    activePowerUps.phaser.duration = 0;
    activePowerUps.timeSlow.active = false;
    activePowerUps.timeSlow.duration = 0;
    
    // Create initial obstacles with dynamic spacing
    for (let i = 1; i < 4; i++) {
        createObstacle(canvas.width + i * getObstacleSpacing());
    }
}

// Create obstacle pair
function createObstacle(x) {
    const gapStart = Math.random() * (canvas.height - obstacleGap - 100) + 50;
    
    // Add moving obstacles after score 40
    const isMoving = score >= 40 && Math.random() < 0.4; // 40% chance
    
    obstacles.push({
        x: x,
        topHeight: gapStart,
        bottomY: gapStart + obstacleGap,
        bottomHeight: canvas.height - (gapStart + obstacleGap),
        passed: false,
        moving: isMoving,
        moveDirection: Math.random() > 0.5 ? 1 : -1, // 1 for down, -1 for up
        moveSpeed: 1 + Math.random() * 1.5, // Random speed between 1-2.5
        originalGapStart: gapStart
    });
    
    // Spawn phaser gems after score 20, but not when power-up is active
    if (score >= 20 && score < 50 && !activePowerUps.phaser.active && Math.random() < 0.15) { // 15% chance
        createGem(x + obstacleWidth/2, gapStart + obstacleGap/2, 'phaser');
    }
    // Spawn time slow gems after score 50, but not when power-up is active
    else if (score >= 50 && !activePowerUps.timeSlow.active && Math.random() < 0.15) { // 15% chance
        createGem(x + obstacleWidth/2, gapStart + obstacleGap/2, 'timeSlow');
    }
}

// Create gem
function createGem(x, y, type) {
    gems.push({
        x: x - gemSize/2,
        y: y - gemSize/2,
        width: gemSize,
        height: gemSize,
        type: type,
        collected: false,
        rotation: 0,
        pulseOffset: Math.random() * Math.PI * 2
    });
}

// Create particle effect
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30,
            color: color
        });
    }
}

// Activate power-up
function activatePowerUp(type) {
    if (type === 'phaser') {
        phaserGemsCollected++;
        
        // Only activate if we have collected enough gems
        if (phaserGemsCollected >= phaserGemsRequired) {
            activePowerUps.phaser.active = true;
            activePowerUps.phaser.duration = activePowerUps.phaser.maxDuration;
            phaserGemsCollected = 0; // Reset counter
            
            updatePlayerColor();
            // createParticles(player.x + player.width/2, player.y + player.height/2, '#2ecc71');
            
            // // Create burst of phaser particles when activated
            // for (let i = 0; i < 20; i++) {
            //     const angle = (Math.PI * 2 * i) / 20;
            //     phaserParticles.push({
            //         x: player.x + player.width/2,
            //         y: player.y + player.height/2,
            //         vx: Math.cos(angle) * 4,
            //         vy: Math.sin(angle) * 4,
            //         life: 80,
            //         maxLife: 80,
            //         size: 3 + Math.random() * 2,
            //         color: `hsl(${120 + Math.random() * 60}, 90%, 70%)`,
            //         glow: true
            //     });
            // }
        }
    } else if (type === 'timeSlow') {
        timeSlowGemsCollected++;
        
        // Only activate if we have collected enough gems
        if (timeSlowGemsCollected >= timeSlowGemsRequired) {
            activePowerUps.timeSlow.active = true;
            activePowerUps.timeSlow.duration = activePowerUps.timeSlow.maxDuration;
            timeSlowGemsCollected = 0; // Reset counter
            
            updatePlayerColor();
            // createParticles(player.x + player.width/2, player.y + player.height/2, '#3498db');
        }
    }
}

// Deactivate power-up
function deactivatePowerUp(type) {
    if (activePowerUps[type]) {
        activePowerUps[type].active = false;
        activePowerUps[type].duration = 0;
        
        // Play power-up lost sound
        playPowerUpLostSound();
        
        // Create particles to show power-up was lost
        // createParticles(player.x + player.width/2, player.y + player.height/2, '#e74c3c');
        
        if (type === 'phaser') {
            // Clear phaser particles
            phaserTrail = [];
        }
        
        // Update player color
        updatePlayerColor();
    }
}

// Update player color based on active power-ups
function updatePlayerColor() {
    if (activePowerUps.phaser.active) {
        player.color = '#2ecc71'; // Green for phaser
    } else if (activePowerUps.timeSlow.active) {
        player.color = '#3498db'; // Blue for time slow
    } else {
        player.color = '#b2795c'; // Default color
    }
}

// Handle player taking damage
function takeDamage() {
    if (player.invulnerable) return false;
    
    // Player always dies in one hit now
    return true; // Trigger game over
}

// Create continuous phaser particles
function createPhaserParticles() {
    if (!activePowerUps.phaser.active) return;
    
    // Create particles around player
    for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        phaserParticles.push({
            x: player.x + player.width/2 + Math.cos(angle) * distance,
            y: player.y + player.height/2 + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 30,
            maxLife: 30,
            size: 2 + Math.random() * 2,
            color: `hsl(${120 + Math.random() * 60}, 90%, 70%)`,
            glow: true
        });
    }
}

// Update game logic
function update() {
    if (gameState !== 'playing') return;

    // Update power-up system
    if (activePowerUps.phaser.active) {
        activePowerUps.phaser.duration--;
        if (activePowerUps.phaser.duration <= 0) {
            deactivatePowerUp('phaser');
        }
        
        // Create continuous phaser particles
        createPhaserParticles();
    }

    if (activePowerUps.timeSlow.active) {
        activePowerUps.timeSlow.duration--;
        if (activePowerUps.timeSlow.duration <= 0) {
            deactivatePowerUp('timeSlow');
        }
    }

    // Create phaser trail
    createPhaserTrail();

    // Update trail
    phaserTrail = phaserTrail.filter(segment => {
        segment.life--;
        return segment.life > 0;
    });
    
    // Update invulnerability timer
    if (player.invulnerable) {
        player.invulnerabilityTimer--;
        if (player.invulnerabilityTimer <= 0) {
            player.invulnerable = false;
        }
    }
    
    // Update player color
    updatePlayerColor();

    // Update player
    player.velocity += player.gravity;
    player.y += player.velocity;

    const timeSlowFactor = activePowerUps.timeSlow.active ? 0.3 : 1.0; // 30% speed when active
    const currentGameSpeed = gameSpeed * timeSlowFactor;

    // Update gems
    gems.forEach(gem => {
        gem.x -= currentGameSpeed;
        gem.rotation += 0.1;
    });

    // Remove off-screen gems
    gems = gems.filter(gem => gem.x > -gemSize);

    // Update obstacles
    obstacles.forEach(obstacle => {
        obstacle.x -= currentGameSpeed;
        
        // Update moving obstacles (score >= 40)
        if (obstacle.moving) {
            const moveAmount = obstacle.moveSpeed * obstacle.moveDirection;
            obstacle.topHeight += moveAmount;
            obstacle.bottomY += moveAmount;
            
            // Reverse direction if hitting boundaries
            if (obstacle.topHeight <= 50 || obstacle.bottomY >= canvas.height - 50) {
                obstacle.moveDirection *= -1;
            }
            
            // Keep gap consistent
            obstacle.bottomHeight = canvas.height - obstacle.bottomY;
        }
        
        // Check if player passed obstacle
        if (!obstacle.passed && obstacle.x + obstacleWidth < player.x) {
            obstacle.passed = true;
            score++;
            currentScoreEl.textContent = score;
            
            // Play score sound
            playScoreSound();
            
            // Increase game speed slightly
            gameSpeed += 0.05;
            
            // Create celebration particles
            createParticles(player.x + player.width/2, player.y + player.height/2, '#b2795c');
        }
    });

    // Remove off-screen obstacles and add new ones
    obstacles = obstacles.filter(obstacle => obstacle.x > -obstacleWidth);
    
    if (obstacles.length < 3) {
        const lastObstacle = obstacles[obstacles.length - 1];
        createObstacle(lastObstacle.x + getObstacleSpacing()); // Use dynamic spacing
    }

    // Update particles
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        particle.life--;
        return particle.life > 0;
    });

    // Update phaser particles
    phaserParticles = phaserParticles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        // Add slight gravity and slow down
        particle.vy += 0.1;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        
        return particle.life > 0;
    });

    // Check collisions
    checkCollisions();
    checkGemCollisions();
}

// Check gem collisions
function checkGemCollisions() {
    gems.forEach((gem, index) => {
        if (!gem.collected &&
            player.x < gem.x + gem.width &&
            player.x + player.width > gem.x &&
            player.y < gem.y + gem.height &&
            player.y + player.height > gem.y) {
            
            // Collect gem
            gem.collected = true;
            gems.splice(index, 1);
            
            // Activate power-up
            activatePowerUp(gem.type);
            
            // Play gem sound
            playGemSound();
            
            // Create collection particles
            // createParticles(gem.x + gem.width/2, gem.y + gem.height/2, '#2ecc71');
        }
    });
}

// Check collisions
function checkCollisions() {
    // Ground and ceiling collision
    if (player.y <= 0 || player.y + player.height >= canvas.height) {
        if (takeDamage()) {
            gameOver();
        }
        return;
    }

    // Skip obstacle collision if phaser power-up is active
    if (activePowerUps.phaser.active) {
        return;
    }

    // Obstacle collision
    obstacles.forEach((obstacle, index) => {
        if (player.x < obstacle.x + obstacleWidth &&
            player.x + player.width > obstacle.x) {
            
            // Check collision with top obstacle
            if (player.y < obstacle.topHeight) {
                if (takeDamage()) {
                    gameOver();
                }
            }
            
            // Check collision with bottom obstacle
            if (player.y + player.height > obstacle.bottomY) {
                if (takeDamage()) {
                    gameOver();
                }
            }
        }
    });
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    finalScoreEl.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'block';
    
    // Play game over sound
    playGameOverSound();
    
    // Create explosion particles
    createParticles(player.x + player.width/2, player.y + player.height/2, '#b74b4b');
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid effect
    ctx.strokeStyle = 'rgba(178, 121, 92, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw obstacles
    obstacles.forEach(obstacle => {
        // Determine colors based on obstacle type and phaser state
        let fillColor = '#b74b4b';
        let strokeColor = 'rgba(183, 75, 75, 0.8)';
        
        if (activePowerUps.phaser.active) {
            // Make obstacles appear passable when phaser is active
            fillColor = 'rgba(46, 204, 113, 0.3)'; // Semi-transparent green
            strokeColor = 'rgba(46, 204, 113, 0.6)';
        } else if (obstacle.moving) {
            fillColor = '#9b59b6'; // Purple for moving
            strokeColor = 'rgba(155, 89, 182, 0.8)';
        }
        
        // Top obstacle
        ctx.fillStyle = fillColor;
        ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
        
        // Add border glow
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
        
        // Bottom obstacle
        ctx.fillStyle = fillColor;
        ctx.fillRect(obstacle.x, obstacle.bottomY, obstacleWidth, obstacle.bottomHeight);
        
        ctx.strokeStyle = strokeColor;
        ctx.strokeRect(obstacle.x, obstacle.bottomY, obstacleWidth, obstacle.bottomHeight);
        
        // Add phaser effect overlay when active
        if (activePowerUps.phaser.active) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(46, 204, 113, ${0.1 * pulse})`;
            ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
            ctx.fillRect(obstacle.x, obstacle.bottomY, obstacleWidth, obstacle.bottomHeight);
        }
    });

    // Draw gems
    gems.forEach(gem => {
        if (gem.collected) return;
        
        ctx.save();
        ctx.translate(gem.x + gem.width/2, gem.y + gem.height/2);
        ctx.rotate(gem.rotation);
        
        // Draw gem with pulsing effect
        const pulse = Math.sin(Date.now() * 0.005 + gem.pulseOffset) * 0.2 + 1;
        const size = gemSize * pulse;
        
        // Gem color based on type
        const gemColor = gem.type === 'phaser' ? '#2ecc71' : '#3498db';
        
        // Draw gem shape (diamond)
        ctx.fillStyle = gemColor;
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/2, 0);
        ctx.lineTo(0, size/2);
        ctx.lineTo(-size/2, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add gem glow
        ctx.strokeStyle = gemColor + '80';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add sparkle effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-2, -2, 4, 4);
        
        ctx.restore();
    });

    // Draw phaser particles first (behind player)
    if (phaserTrail.length > 1) {
        ctx.save();
        for (let i = 0; i < phaserTrail.length - 1; i++) {
            const segment = phaserTrail[i];
            const nextSegment = phaserTrail[i + 1];
            const alpha = segment.life / segment.maxLife;
            const thickness = 8 * alpha;
            
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = thickness;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(segment.x, segment.y);
            ctx.lineTo(nextSegment.x, nextSegment.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Draw player with special effects
    if (player.invulnerable && Math.floor(Date.now() / 100) % 2) {
        // Flashing effect when invulnerable
        ctx.globalAlpha = 0.5;
    }
    
    if (activePowerUps.phaser.active) {
        // Enhanced phaser effect
        ctx.save();
        
        // Draw glowing aura around player
        const glowSize = 40 + Math.sin(Date.now() * 0.01) * 10;
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#2ecc71';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#2ecc71';
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Player with pulsing transparency
        const pulse = Math.sin(Date.now() * 0.02) * 0.3 + 0.5;
        ctx.globalAlpha = pulse;
    }
    
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Player glow effect
    ctx.strokeStyle = player.color + '80';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Enhanced phaser player effect
    if (activePowerUps.phaser.active) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#2ecc71';
        ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
        ctx.restore();
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;

    // Draw power-up bars at bottom of screen
    drawPowerUpBars();

    // Draw regular particles
    particles.forEach(particle => {
        const alpha = particle.life / 30;
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });

    // Draw phaser particles
    phaserParticles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (particle.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
        }
        
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Draw power-up bars at bottom of screen
// Draw power-up bars at bottom of screen
function drawPowerUpBars() {
    const barWidth = 120;
    const barHeight = 12;
    const startX = 10;
    const startY = canvas.height - 50;
    
    if (activePowerUps.phaser.active) {
        // Background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(startX, startY, barWidth, barHeight);
        
        // Progress bar with pulsing effect
        const progress = activePowerUps.phaser.duration / activePowerUps.phaser.maxDuration;
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
        ctx.fillRect(startX + 2, startY + 2, (barWidth - 4) * progress, barHeight - 4);
        
        // Border with glow
        ctx.save();
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#2ecc71';
        ctx.strokeRect(startX, startY, barWidth, barHeight);
        ctx.restore();
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText('PHASER', startX + 5, startY - 5);
    }
    
    if (activePowerUps.timeSlow.active) {
        const timeSlowBarY = startY - 20; // Position above phaser bar
        
        // Background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(startX, timeSlowBarY, barWidth, barHeight);
        
        // Progress bar with pulsing effect
        const progress = activePowerUps.timeSlow.duration / activePowerUps.timeSlow.maxDuration;
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(52, 152, 219, ${pulse})`;
        ctx.fillRect(startX + 2, timeSlowBarY + 2, (barWidth - 4) * progress, barHeight - 4);
        
        // Border with glow
        ctx.save();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#3498db';
        ctx.strokeRect(startX, timeSlowBarY, barWidth, barHeight);
        ctx.restore();
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText('TIME SLOW', startX + 5, timeSlowBarY - 5);
    }
    
    // Draw phaser gem collection progress (only when score >= 20)
    if (score >= 20 && phaserGemsCollected > 0) {
        const gemX = startX + 150;
        const gemY = startY + 20;
        
        ctx.fillStyle = '#2ecc71';
        ctx.font = '12px Arial';
        ctx.fillText(`Phaser Gems: ${phaserGemsCollected}/${phaserGemsRequired}`, gemX, gemY);
    }
    
    // Draw time slow gem collection progress (only when score >= 50)
    if (score >= 50 && timeSlowGemsCollected > 0) {
        const gemX = startX + 150;
        const gemY = startY + 35;
        
        ctx.fillStyle = '#3498db';
        ctx.font = '12px Arial';
        ctx.fillText(`Time Slow Gems: ${timeSlowGemsCollected}/${timeSlowGemsRequired}`, gemX, gemY);
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Player jump
function jump() {
    if (gameState === 'playing') {
        player.velocity = player.jump;
        
        // Play jump sound
        playJumpSound();
        
        // Create jump particles
        createParticles(player.x + player.width/2, player.y + player.height, 'rgba(178, 121, 92, 0.6)');
    }
}

// Start game
function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Initialize audio on first user interaction
    if (!audioContext) {
        initAudio();
    }
    
    init();
}

// Handle touch events
function handleTouch(e) {
    e.preventDefault();
    
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        jump();
    } else if (gameState === 'gameOver') {
        startGame();
    }
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Mouse events
canvas.addEventListener('click', (e) => {
    e.preventDefault();
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        jump();
    } else if (gameState === 'gameOver') {
        startGame();
    }
});

// Touch events for mobile
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchend', handleTouch, { passive: false });

// Prevent scrolling on mobile when touching the canvas
document.addEventListener('touchstart', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Keyboard events
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'playing') {
            jump();
        } else if (gameState === 'gameOver') {
            startGame();
        }
    }
});

// Initialize and start game loop
init();
gameLoop();