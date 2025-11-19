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
    money: 0, // Monnaie du jeu
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
    cameraY: 0, // Décalage vertical de la caméra
    targetCameraY: 0, // Position cible de la caméra
};

// ============================================
// SYSTÈME D'AMÉLIORATIONS
// ============================================
const upgrades = {
    lineLength: {
        level: 0,
        maxLevel: 10,
        baseCost: 50,
        baseValue: 400,
        increment: 200,
        name: "Longueur de ligne",
        description: "Pêchez plus profond !",
        getCost: function() {
            return Math.floor(this.baseCost * Math.pow(1.5, this.level));
        },
        getValue: function() {
            return this.baseValue + (this.increment * this.level);
        }
    },
    hookStrength: {
        level: 1,
        maxLevel: 10,
        baseCost: 100,
        baseValue: 30,
        increment: 15,
        name: "Solidité de l'hameçon",
        description: "Capturez des poissons plus gros !",
        getCost: function() {
            return Math.floor(this.baseCost * Math.pow(1.6, this.level - 1));
        },
        getValue: function() {
            return this.baseValue + (this.increment * (this.level - 1));
        }
    }
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
const fishColors = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181',
    '#9B59B6', '#E74C3C', '#2C3E50', '#16A085', '#F39C12',
    '#8E44AD', '#C0392B', '#D35400', '#27AE60', '#2980B9',
    '#E67E22', '#1ABC9C', '#34495E', '#7F8C8D', '#BDC3C7'
];

function createFish() {
    // Profondeur max accessible
    const maxDepth = 150 + upgrades.lineLength.getValue();
    
    // Créer un poisson à une profondeur aléatoire
    const startSide = Math.random() > 0.5 ? 'left' : 'right';
    const fishDepth = 200 + Math.random() * (maxDepth - 200);
    
    // La taille du poisson augmente avec la profondeur
    // Formule : taille de base + bonus selon la profondeur
    const depthFactor = (fishDepth - 200) / 100; // 0 à ~18
    const baseSize = 12 + Math.random() * 8; // 12-20
    const depthBonus = depthFactor * 3; // 0 à ~54
    const fishSize = Math.floor(baseSize + depthBonus);
    
    // Points et argent basés sur la taille
    const points = Math.floor(fishSize * 2);
    const money = Math.floor(fishSize * 0.8);
    
    // Couleur selon la profondeur
    const colorIndex = Math.floor((fishDepth - 200) / 100) % fishColors.length;
    const color = fishColors[colorIndex];
    
    // Vitesse inversement proportionnelle à la taille
    const speed = Math.max(0.3, 2 - (fishSize / 40));
    
    return {
        x: startSide === 'left' ? -50 : canvas.width + 50,
        y: fishDepth,
        size: fishSize,
        points: points,
        money: money,
        color: color,
        speed: speed,
        direction: startSide === 'left' ? 1 : -1,
        amplitude: 20 + Math.random() * 30,
        frequency: 0.02 + Math.random() * 0.03,
        offset: Math.random() * Math.PI * 2,
    };
}

// Initialiser les poissons
function initFishes() {
    fishes.length = 0;
    const fishCount = 8 + Math.floor(upgrades.lineLength.level * 2);
    for (let i = 0; i < fishCount; i++) {
        fishes.push(createFish());
    }
}

// ============================================
// DESSIN - PIXEL ART
// ============================================

// Dessiner le ciel et l'eau
function drawBackground() {
    ctx.save();
    
    // Appliquer la translation de la caméra
    ctx.translate(0, -gameState.cameraY);
    
    // Ciel (toujours visible en haut)
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

    // Eau avec dégradé (étendue selon la profondeur max)
    const maxWaterDepth = 150 + upgrades.lineLength.getValue() + 200;
    const waterGradient = ctx.createLinearGradient(0, 150, 0, maxWaterDepth);
    waterGradient.addColorStop(0, '#1E90FF');
    waterGradient.addColorStop(0.3, '#1873CC');
    waterGradient.addColorStop(0.6, '#0D4A8F');
    waterGradient.addColorStop(1, '#05263D');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 152, canvas.width, maxWaterDepth - 152);

    // Vagues (lignes de pixels)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 160; y < maxWaterDepth; y += 40) {
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
    
    // Indicateurs de profondeur
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px Courier New';
    for (let depth = 200; depth <= maxWaterDepth; depth += 100) {
        const displayDepth = depth - 150;
        ctx.fillText(`${displayDepth}m`, 10, depth);
    }
    
    ctx.restore();
}

// Dessiner la barque (style pixel art)
function drawBoat() {
    ctx.save();
    ctx.translate(0, -gameState.cameraY);
    
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
    ctx.translate(0, -gameState.cameraY);
    
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
    ctx.translate(0, -gameState.cameraY);
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
    
    // Vérifier si ce poisson est trop gros pour l'hameçon actuel
    const hookCapacity = upgrades.hookStrength.getValue();
    const isTooLarge = fish.size > hookCapacity;
    
    // Aura de danger si le poisson est trop gros
    if (isTooLarge) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size + 5, fish.size * 0.6 + 3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Corps du poisson
    ctx.fillStyle = fish.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, fish.size, fish.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bordure plus épaisse pour les gros poissons
    if (fish.size > 30) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Queue (proportionnelle à la taille)
    const tailSize = Math.max(8, fish.size * 0.3);
    ctx.beginPath();
    ctx.moveTo(-fish.size, 0);
    ctx.lineTo(-fish.size - tailSize, -tailSize * 0.75);
    ctx.lineTo(-fish.size - tailSize, tailSize * 0.75);
    ctx.closePath();
    ctx.fill();
    
    // Nageoires (proportionnelles)
    ctx.beginPath();
    ctx.moveTo(0, -fish.size * 0.6);
    ctx.lineTo(-fish.size * 0.1, -fish.size * 0.8);
    ctx.lineTo(fish.size * 0.1, -fish.size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Œil (proportionnel)
    const eyeSize = Math.max(4, fish.size * 0.15);
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(fish.size * 0.5, -fish.size * 0.1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(fish.size * 0.5 + 1, -fish.size * 0.1, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Écailles (détails pixel art) - plus pour les gros poissons
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const scaleSpacing = Math.max(5, fish.size * 0.25);
    for (let i = -fish.size * 0.5; i < fish.size * 0.5; i += scaleSpacing) {
        ctx.beginPath();
        ctx.arc(i, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Afficher la taille du poisson au-dessus
    ctx.scale(fish.direction, 1); // Remettre le texte à l'endroit
    ctx.fillStyle = isTooLarge ? '#FF0000' : '#FFFFFF';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`${fish.size}`, 0, -fish.size - 10);
    ctx.fillText(`${fish.size}`, 0, -fish.size - 10);
    
    ctx.restore();
}

// Dessiner tous les poissons
function drawFishes() {
    ctx.save();
    ctx.translate(0, -gameState.cameraY);
    fishes.forEach(fish => {
        drawFish(fish);
    });
    ctx.restore();
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
    ctx.save();
    ctx.translate(0, -gameState.cameraY);
    waterSplashes.forEach(splash => {
        const alpha = splash.life / splash.maxLife;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(splash.x, splash.y, 3, 3);
    });
    ctx.restore();
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
            // Vérifier si l'hameçon est assez solide
            const hookCapacity = upgrades.hookStrength.getValue();
            
            if (fish.size > hookCapacity) {
                // LIGNE CASSÉE ! Poisson trop gros
                breakLine(fish);
                return;
            }
            
            // Poisson attrapé avec succès !
            gameState.score += fish.points;
            gameState.money += fish.money;
            gameState.fishCaught++;
            updateUI();
            
            // Créer un nouveau poisson
            fishes[index] = createFish();
            
            // Effet visuel de capture
            createSplash(fish.x, fish.y);
            createCatchEffect(fish.x, fish.y, fish.money);
        }
    });
}

// Effet quand la ligne casse
function breakLine(fish) {
    // Animation de rupture
    gameState.phase = 'broken';
    
    // Créer beaucoup de particules
    for (let i = 0; i < 20; i++) {
        waterSplashes.push({
            x: gameState.hookX,
            y: gameState.hookY,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 40,
            maxLife: 40,
        });
    }
    
    // Message d'alerte
    showWarningMessage(`⚠️ LIGNE CASSÉE ! Poisson trop gros (${fish.size}px) pour votre hameçon (${upgrades.hookStrength.getValue()}px)`);
    
    // Retour à idle après un délai
    setTimeout(() => {
        gameState.phase = 'idle';
        gameState.lineLength = 0;
    }, 1000);
}

// Effet visuel quand on attrape un poisson
const catchEffects = [];

function createCatchEffect(x, y, money) {
    catchEffects.push({
        x: x,
        y: y,
        text: `+${money}💰`,
        life: 60,
        maxLife: 60,
    });
}

function updateCatchEffects() {
    for (let i = catchEffects.length - 1; i >= 0; i--) {
        const effect = catchEffects[i];
        effect.life--;
        effect.y -= 1;
        
        if (effect.life <= 0) {
            catchEffects.splice(i, 1);
        }
    }
}

function drawCatchEffects() {
    ctx.save();
    ctx.translate(0, -gameState.cameraY);
    
    catchEffects.forEach(effect => {
        const alpha = effect.life / effect.maxLife;
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text, effect.x, effect.y);
    });
    
    ctx.restore();
}

// Messages d'avertissement
let warningMessage = null;
let warningTimer = 0;

function showWarningMessage(message) {
    warningMessage = message;
    warningTimer = 180; // 3 secondes à 60 FPS
}

function updateWarningMessage() {
    if (warningTimer > 0) {
        warningTimer--;
        if (warningTimer === 0) {
            warningMessage = null;
        }
    }
}

function drawWarningMessage() {
    if (!warningMessage) return;
    
    ctx.save();
    
    const alpha = Math.min(1, warningTimer / 30);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
    ctx.fillRect(0, 250, canvas.width, 100);
    
    ctx.fillStyle = `rgba(255, 69, 0, ${alpha})`;
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(warningMessage, canvas.width / 2, 300);
    
    ctx.restore();
}

// Afficher la capacité de l'hameçon en permanence
function drawHookCapacityIndicator() {
    ctx.save();
    
    const hookCapacity = upgrades.hookStrength.getValue();
    
    // Fond
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 50);
    
    // Bordure
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 50);
    
    // Icône hameçon
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(25, 35, 5, 0, Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(30, 35);
    ctx.lineTo(30, 40);
    ctx.lineTo(28, 38);
    ctx.stroke();
    
    // Texte
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('🪝 Capacité:', 40, 28);
    
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText(`${hookCapacity} px`, 40, 48);
    
    ctx.restore();
}

// Lancer la ligne
function castLine(targetX) {
    if (gameState.phase !== 'idle') return;
    
    gameState.phase = 'casting';
    gameState.lineX = targetX;
    gameState.lineLength = 0;
    gameState.hookX = player.x + 25;
    gameState.hookY = player.y - 10;
    
    // Calculer la profondeur cible selon l'amélioration
    const maxDepth = 150 + upgrades.lineLength.getValue();
    
    gameState.castTarget = {
        x: targetX,
        y: maxDepth,
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
    if (gameState.phase !== 'reeling' && gameState.phase !== 'broken') return;
    
    // Si la ligne est cassée, juste remonter sans attraper
    if (gameState.phase === 'broken') {
        const rodTipX = player.x + 25;
        const rodTipY = player.y - 10;
        
        const dyToRod = rodTipY - gameState.hookY;
        const dxToRod = rodTipX - gameState.hookX;
        const distanceToRod = Math.sqrt(dxToRod * dxToRod + dyToRod * dyToRod);
        
        if (distanceToRod > 5) {
            gameState.hookX += (dxToRod / distanceToRod) * gameState.reelSpeed;
            gameState.hookY += (dyToRod / distanceToRod) * gameState.reelSpeed;
        }
        return;
    }
    
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

// Mettre à jour la caméra pour suivre l'hameçon
function updateCamera() {
    // Calculer la position cible de la caméra
    if (gameState.phase === 'casting' || gameState.phase === 'fishing' || gameState.phase === 'reeling' || gameState.phase === 'broken') {
        // Suivre l'hameçon si il descend sous une certaine profondeur
        const hookDepth = gameState.hookY - 150; // Profondeur relative à la surface
        
        if (hookDepth > 250) {
            // Centrer la caméra sur l'hameçon
            gameState.targetCameraY = hookDepth - 250;
        } else {
            gameState.targetCameraY = 0;
        }
    } else {
        // Retour en position normale
        gameState.targetCameraY = 0;
    }
    
    // Interpolation douce de la caméra
    const cameraSpeed = 0.1;
    gameState.cameraY += (gameState.targetCameraY - gameState.cameraY) * cameraSpeed;
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
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('fishCount').textContent = gameState.fishCaught;
    document.getElementById('timer').textContent = Math.floor(gameState.tick / TICK_RATE);
    
    // Mettre à jour les boutons d'amélioration
    updateUpgradeButtons();
}

function updateUpgradeButtons() {
    // Mise à jour bouton longueur de ligne
    const lineLengthBtn = document.getElementById('upgradeLine');
    const lineUpgrade = upgrades.lineLength;
    
    if (lineUpgrade.level >= lineUpgrade.maxLevel) {
        lineLengthBtn.textContent = `✓ MAX`;
        lineLengthBtn.disabled = true;
    } else {
        const cost = lineUpgrade.getCost();
        lineLengthBtn.textContent = `Améliorer (${cost}💰)`;
        lineLengthBtn.disabled = gameState.money < cost;
    }
    
    document.getElementById('lineInfo').textContent = 
        `Niveau ${lineUpgrade.level}/${lineUpgrade.maxLevel} - Profondeur: ${Math.floor(lineUpgrade.getValue() / 10)}m`;
    
    // Mise à jour bouton hameçon
    const hookBtn = document.getElementById('upgradeHook');
    const hookUpgrade = upgrades.hookStrength;
    
    if (hookUpgrade.level >= hookUpgrade.maxLevel) {
        hookBtn.textContent = `✓ MAX`;
        hookBtn.disabled = true;
    } else {
        const cost = hookUpgrade.getCost();
        hookBtn.textContent = `Améliorer (${cost}💰)`;
        hookBtn.disabled = gameState.money < cost;
    }
    
    document.getElementById('hookInfo').textContent = 
        `Niveau ${hookUpgrade.level}/${hookUpgrade.maxLevel} - Capacité: ${hookUpgrade.getValue()}px`;
}

function buyUpgrade(upgradeName) {
    const upgrade = upgrades[upgradeName];
    
    if (upgrade.level >= upgrade.maxLevel) return;
    
    const cost = upgrade.getCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        upgrade.level++;
        
        // Mettre à jour la longueur max de la ligne
        gameState.maxLineLength = upgrade.getValue();
        
        // Réinitialiser les poissons pour avoir de nouveaux types
        initFishes();
        
        updateUI();
    }
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
    
    // Mettre à jour les particules et effets
    updateSplashes();
    updateCatchEffects();
    updateWarningMessage();
    
    // Mettre à jour la caméra
    updateCamera();
    
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
    drawCatchEffects();
    drawWarningMessage();
    drawHookCapacityIndicator();
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

function initGame(fullReset = false) {
    gameState.tick = 0;
    gameState.phase = 'idle';
    gameState.isPlaying = true;
    gameState.cameraY = 0;
    gameState.targetCameraY = 0;
    
    if (fullReset) {
        // Reset complet uniquement si demandé
        gameState.score = 0;
        gameState.money = 0;
        gameState.fishCaught = 0;
        gameState.time = 0;
        
        // Réinitialiser les améliorations
        upgrades.lineLength.level = 0;
        upgrades.hookStrength.level = 1;
    }
    
    gameState.maxLineLength = upgrades.lineLength.getValue();
    
    // Réinitialiser le système de ticks
    lastTickTime = 0;
    tickAccumulator = 0;
    
    // Vider les effets
    catchEffects.length = 0;
    waterSplashes.length = 0;
    warningMessage = null;
    warningTimer = 0;
    
    initFishes();
    updateUI();
}

// Bouton de redémarrage
document.getElementById('restartButton').addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment tout réinitialiser ? Vous perdrez toutes vos améliorations !')) {
        initGame(true);
    }
});

// Exposer buyUpgrade globalement pour le onclick
window.buyUpgrade = buyUpgrade;

// Démarrer le jeu
initGame();
gameLoop();

