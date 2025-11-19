// ============================================
// PIXEL FISHING GAME - Pure JavaScript
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Désactiver l'antialiasing pour le style pixel art
ctx.imageSmoothingEnabled = false;

// ============================================
// SYSTÈME DE TICKS
// ============================================
const TICK_RATE = 60; // Ticks par seconde
const TICK_INTERVAL = 1000 / TICK_RATE; // Millisecondes par tick
let lastTickTime = 0;
let tickAccumulator = 0;

// ============================================
// ÉTAT DU JEU
// ============================================
const gameState = {
    score: 0,
    fishCaught: 0,
    time: 0,
    tick: 0,
    isPlaying: false,
    phase: 'idle', // idle, casting, fishing, reeling
    lineLength: 0,
    lineX: 400,
    lineY: 0,
    maxLineLength: 400,
    hookX: 400,
    hookY: 0,
    reelSpeed: 2,
    horizontalSpeed: 4,
    mouseX: 400, // Position X de la souris
    targetHookX: 400, // Position cible de l'hameçon
};

// ============================================
// JOUEUR ET BARQUE
// ============================================
const boat = {
    x: 350,
    y: 80,
    width: 100,
    height: 40,
};

const player = {
    x: 395,
    y: 60,
    width: 20,
    height: 30,
};

// ============================================
// POISSONS
// ============================================
const fishes = [];
const fishTypes = [
    { color: '#FF6B6B', size: 15, points: 10, speed: 1.5 },
    { color: '#4ECDC4', size: 20, points: 20, speed: 1 },
    { color: '#FFD93D', size: 12, points: 15, speed: 2 },
    { color: '#95E1D3', size: 25, points: 30, speed: 0.8 },
    { color: '#F38181', size: 18, points: 25, speed: 1.2 },
];

function createFish() {
    const type = fishTypes[Math.floor(Math.random() * fishTypes.length)];
    const startSide = Math.random() > 0.5 ? 'left' : 'right';
    
    return {
        x: startSide === 'left' ? -50 : canvas.width + 50,
        y: 200 + Math.random() * 350,
        ...type,
        direction: startSide === 'left' ? 1 : -1,
        amplitude: 20 + Math.random() * 30,
        frequency: 0.02 + Math.random() * 0.03,
        offset: Math.random() * Math.PI * 2,
    };
}

// Initialiser les poissons
function initFishes() {
    fishes.length = 0;
    for (let i = 0; i < 8; i++) {
        fishes.push(createFish());
    }
}

// ============================================
// DESSIN - PIXEL ART
// ============================================

// Dessiner le ciel et l'eau
function drawBackground() {
    // Ciel
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 150);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, 150);

    // Soleil
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(700, 50, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Rayons du soleil (style pixel)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + gameState.tick * 0.01;
        ctx.beginPath();
        ctx.moveTo(700 + Math.cos(angle) * 35, 50 + Math.sin(angle) * 35);
        ctx.lineTo(700 + Math.cos(angle) * 50, 50 + Math.sin(angle) * 50);
        ctx.stroke();
    }

    // Ligne d'eau
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(0, 150, canvas.width, 2);

    // Eau avec dégradé
    const waterGradient = ctx.createLinearGradient(0, 150, 0, canvas.height);
    waterGradient.addColorStop(0, '#1E90FF');
    waterGradient.addColorStop(0.5, '#1873CC');
    waterGradient.addColorStop(1, '#0D4A8F');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 152, canvas.width, canvas.height - 152);

    // Vagues (lignes de pixels)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 160; y < canvas.height; y += 40) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 8) {
            const waveY = y + Math.sin(x * 0.05 + gameState.tick * 0.05) * 3;
            if (x === 0) {
                ctx.moveTo(x, waveY);
            } else {
                ctx.lineTo(x, waveY);
            }
        }
        ctx.stroke();
    }
}

// Dessiner la barque (style pixel art)
function drawBoat() {
    ctx.save();
    
    // Ombre de la barque
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(boat.x - 5, 148, boat.width + 10, 4);
    
    // Coque de la barque
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(boat.x + 10, boat.y + boat.height);
    ctx.lineTo(boat.x, boat.y + 10);
    ctx.lineTo(boat.x + boat.width, boat.y + 10);
    ctx.lineTo(boat.x + boat.width - 10, boat.y + boat.height);
    ctx.closePath();
    ctx.fill();
    
    // Bordure de la barque
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Bancs de la barque
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(boat.x + 15, boat.y + 20, 70, 5);
    ctx.fillRect(boat.x + 15, boat.y + 30, 70, 5);
    
    ctx.restore();
}

// Dessiner le joueur (pêcheur pixel art)
function drawPlayer() {
    ctx.save();
    
    // Tête
    ctx.fillStyle = '#FFD1A3';
    ctx.fillRect(player.x + 5, player.y, 10, 10);
    
    // Chapeau
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(player.x + 3, player.y - 5, 14, 5);
    ctx.fillRect(player.x + 5, player.y - 8, 10, 3);
    
    // Yeux
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 7, player.y + 3, 2, 2);
    ctx.fillRect(player.x + 11, player.y + 3, 2, 2);
    
    // Corps
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(player.x + 4, player.y + 10, 12, 15);
    
    // Bras (dépend de l'état)
    ctx.fillStyle = '#FFD1A3';
    if (gameState.phase === 'idle') {
        // Bras au repos
        ctx.fillRect(player.x, player.y + 12, 4, 10);
        ctx.fillRect(player.x + 16, player.y + 12, 4, 10);
    } else {
        // Bras tenant la canne
        ctx.fillRect(player.x + 14, player.y + 8, 4, 12);
        // Canne à pêche
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 10);
        ctx.lineTo(player.x + 25, player.y - 10);
        ctx.stroke();
    }
    
    // Jambes
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(player.x + 6, player.y + 25, 4, 8);
    ctx.fillRect(player.x + 10, player.y + 25, 4, 8);
    
    ctx.restore();
}

// Dessiner la ligne de pêche
function drawFishingLine() {
    if (gameState.phase === 'idle') return;
    
    ctx.save();
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    // Point de départ (bout de la canne)
    const rodTipX = player.x + 25;
    const rodTipY = player.y - 10;
    
    ctx.beginPath();
    ctx.moveTo(rodTipX, rodTipY);
    ctx.lineTo(gameState.hookX, gameState.hookY);
    ctx.stroke();
    
    // Hameçon
    drawHook(gameState.hookX, gameState.hookY);
    
    ctx.restore();
}

// Dessiner l'hameçon
function drawHook(x, y) {
    ctx.save();
    
    // Corps de l'hameçon
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + 5, 5, 0, Math.PI);
    ctx.stroke();
    
    // Pointe
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + 5, y + 10);
    ctx.lineTo(x + 3, y + 8);
    ctx.stroke();
    
    // Appât
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.arc(x, y + 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Dessiner un poisson (pixel art)
function drawFish(fish) {
    ctx.save();
    ctx.translate(fish.x, fish.y);
    
    // Retourner le poisson selon sa direction
    if (fish.direction === -1) {
        ctx.scale(-1, 1);
    }
    
    // Corps du poisson
    ctx.fillStyle = fish.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, fish.size, fish.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Queue
    ctx.beginPath();
    ctx.moveTo(-fish.size, 0);
    ctx.lineTo(-fish.size - 8, -6);
    ctx.lineTo(-fish.size - 8, 6);
    ctx.closePath();
    ctx.fill();
    
    // Nageoires
    ctx.beginPath();
    ctx.moveTo(0, -fish.size * 0.6);
    ctx.lineTo(-3, -fish.size * 0.8);
    ctx.lineTo(3, -fish.size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Œil
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(fish.size * 0.5, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(fish.size * 0.5 + 1, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Écailles (détails pixel art)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = -fish.size * 0.5; i < fish.size * 0.5; i += 5) {
        ctx.beginPath();
        ctx.arc(i, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Dessiner tous les poissons
function drawFishes() {
    fishes.forEach(fish => {
        drawFish(fish);
    });
}

// Dessiner les particules d'eau lors du lancer
const waterSplashes = [];

function createSplash(x, y) {
    for (let i = 0; i < 8; i++) {
        waterSplashes.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -3 - 1,
            life: 30,
            maxLife: 30,
        });
    }
}

function drawSplashes() {
    waterSplashes.forEach(splash => {
        const alpha = splash.life / splash.maxLife;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(splash.x, splash.y, 3, 3);
    });
}

// ============================================
// LOGIQUE DU JEU
// ============================================

// Mettre à jour les poissons (appelé chaque tick)
function updateFishes() {
    fishes.forEach((fish, index) => {
        // Mouvement sinusoïdal
        fish.y += Math.sin(gameState.tick * fish.frequency + fish.offset) * 0.5;
        fish.x += fish.direction * fish.speed;
        
        // Vérifier si le poisson est sorti de l'écran
        if (fish.direction === 1 && fish.x > canvas.width + 100) {
            // Réapparaître à gauche
            fish.x = -50;
            fish.y = 200 + Math.random() * 350;
        } else if (fish.direction === -1 && fish.x < -100) {
            // Réapparaître à droite
            fish.x = canvas.width + 50;
            fish.y = 200 + Math.random() * 350;
        }
    });
}

// Vérifier les collisions avec l'hameçon
function checkFishCollision() {
    if (gameState.phase !== 'reeling') return;
    
    fishes.forEach((fish, index) => {
        const dx = fish.x - gameState.hookX;
        const dy = fish.y - gameState.hookY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < fish.size + 10) {
            // Poisson attrapé !
            gameState.score += fish.points;
            gameState.fishCaught++;
            updateUI();
            
            // Créer un nouveau poisson
            fishes[index] = createFish();
            
            // Effet visuel
            createSplash(fish.x, fish.y);
        }
    });
}

// Lancer la ligne
function castLine(targetX) {
    if (gameState.phase !== 'idle') return;
    
    gameState.phase = 'casting';
    gameState.lineX = targetX;
    gameState.lineLength = 0;
    gameState.hookX = player.x + 25;
    gameState.hookY = player.y - 10;
    gameState.castTarget = {
        x: targetX,
        y: 550,
        startX: player.x + 25,
        startY: player.y - 10
    };
    gameState.castStartTick = gameState.tick;
    gameState.hasSplashed = false;
}

// Mettre à jour le casting
function updateCasting() {
    if (gameState.phase !== 'casting') return;
    
    const castDuration = 30; // Ticks pour l'animation de lancer
    const elapsed = gameState.tick - gameState.castStartTick;
    
    if (elapsed < castDuration) {
        const progress = elapsed / castDuration;
        gameState.hookX = gameState.castTarget.startX + (gameState.castTarget.x - gameState.castTarget.startX) * progress;
        gameState.hookY = gameState.castTarget.startY + (gameState.castTarget.y - gameState.castTarget.startY) * progress;
        
        // Créer un splash quand la ligne touche l'eau
        if (!gameState.hasSplashed && gameState.hookY >= 152) {
            createSplash(gameState.hookX, 152);
            gameState.hasSplashed = true;
        }
    } else {
        gameState.phase = 'fishing';
        gameState.fishingStartTick = gameState.tick;
    }
}

// Mettre à jour la phase de pêche (attente avant remontée)
function updateFishing() {
    if (gameState.phase !== 'fishing') return;
    
    const fishingDuration = 30; // Ticks d'attente
    const elapsed = gameState.tick - gameState.fishingStartTick;
    
    if (elapsed >= fishingDuration) {
        gameState.phase = 'reeling';
    }
}

// Remonter la ligne
function updateReeling() {
    if (gameState.phase !== 'reeling') return;
    
    const rodTipX = player.x + 25;
    const rodTipY = player.y - 10;
    
    // Mouvement horizontal vers la position de la souris (interpolé)
    const targetX = Math.max(50, Math.min(canvas.width - 50, gameState.mouseX));
    const dx = targetX - gameState.hookX;
    
    // Déplacer progressivement vers la cible
    if (Math.abs(dx) > 1) {
        gameState.hookX += Math.sign(dx) * Math.min(Math.abs(dx), gameState.horizontalSpeed);
    }
    
    // Remonter la ligne vers le bout de la canne
    const dyToRod = rodTipY - gameState.hookY;
    const dxToRod = rodTipX - gameState.hookX;
    const distanceToRod = Math.sqrt(dxToRod * dxToRod + dyToRod * dyToRod);
    
    if (distanceToRod > 5) {
        gameState.hookX += (dxToRod / distanceToRod) * gameState.reelSpeed;
        gameState.hookY += (dyToRod / distanceToRod) * gameState.reelSpeed;
    } else {
        // Ligne remontée
        gameState.phase = 'idle';
        gameState.lineLength = 0;
    }
    
    // Vérifier les collisions
    checkFishCollision();
}

// Mettre à jour les particules de splash
function updateSplashes() {
    for (let i = waterSplashes.length - 1; i >= 0; i--) {
        const splash = waterSplashes[i];
        
        if (splash.life <= 0) {
            waterSplashes.splice(i, 1);
            continue;
        }
        
        splash.x += splash.vx;
        splash.y += splash.vy;
        splash.vy += 0.2; // Gravité
        splash.life--;
    }
}

// ============================================
// GESTION DES ÉVÉNEMENTS
// ============================================

// Clic pour lancer la ligne
canvas.addEventListener('click', (e) => {
    if (gameState.phase === 'idle') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Lancer uniquement si on clique dans l'eau
        if (y > 152) {
            castLine(x);
        }
    }
});

// Suivi du mouvement de la souris
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    gameState.mouseX = e.clientX - rect.left;
});

// Initialiser la position de la souris au centre
gameState.mouseX = canvas.width / 2;

// ============================================
// INTERFACE UTILISATEUR
// ============================================

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('fishCount').textContent = gameState.fishCaught;
    document.getElementById('timer').textContent = Math.floor(gameState.tick / TICK_RATE);
}

// ============================================
// BOUCLE DE JEU PRINCIPALE AVEC SYSTÈME DE TICKS
// ============================================

// Mise à jour de la logique (appelée à chaque tick)
function updateGameLogic() {
    // Mettre à jour les poissons
    updateFishes();
    
    // Mettre à jour selon la phase
    updateCasting();
    updateFishing();
    updateReeling();
    
    // Mettre à jour les particules
    updateSplashes();
    
    // Incrémenter le compteur de ticks
    gameState.tick++;
    
    // Mettre à jour l'UI toutes les secondes
    if (gameState.tick % TICK_RATE === 0) {
        updateUI();
    }
}

// Rendu du jeu (appelé à chaque frame)
function renderGame() {
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner tous les éléments
    drawBackground();
    drawFishes();
    drawBoat();
    drawPlayer();
    drawFishingLine();
    drawSplashes();
}

// Boucle principale avec système de ticks
function gameLoop(currentTime) {
    if (!lastTickTime) {
        lastTickTime = currentTime;
    }
    
    // Calculer le temps écoulé depuis le dernier frame
    const deltaTime = currentTime - lastTickTime;
    lastTickTime = currentTime;
    
    // Accumuler le temps
    tickAccumulator += deltaTime;
    
    // Exécuter les ticks nécessaires
    let ticksThisFrame = 0;
    while (tickAccumulator >= TICK_INTERVAL && ticksThisFrame < 5) {
        updateGameLogic();
        tickAccumulator -= TICK_INTERVAL;
        ticksThisFrame++;
    }
    
    // Si on est trop en retard, réinitialiser l'accumulateur
    if (tickAccumulator > TICK_INTERVAL * 5) {
        tickAccumulator = 0;
    }
    
    // Toujours rendre le jeu
    renderGame();
    
    // Continuer la boucle
    requestAnimationFrame(gameLoop);
}

// ============================================
// INITIALISATION
// ============================================

function initGame() {
    gameState.score = 0;
    gameState.fishCaught = 0;
    gameState.time = 0;
    gameState.tick = 0;
    gameState.phase = 'idle';
    gameState.isPlaying = true;
    
    // Réinitialiser le système de ticks
    lastTickTime = 0;
    tickAccumulator = 0;
    
    initFishes();
    updateUI();
}

// Bouton de redémarrage
document.getElementById('restartButton').addEventListener('click', () => {
    initGame();
});

// Démarrer le jeu
initGame();
gameLoop();

