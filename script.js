const svgData = {
    background: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#2d5a27"/>
  <path d="M 100 0 L 150 600 L 50 600 Z" fill="#1e3f1a" />
  <path d="M 600 0 L 700 600 L 550 600 Z" fill="#1e3f1a" />
  <path d="M 300 0 L 320 600 L 280 600 Z" fill="#1a3315" />
  <circle cx="100" cy="50" r="80" fill="#3a7c31" />
  <circle cx="600" cy="80" r="100" fill="#3a7c31" />
  <circle cx="300" cy="-20" r="120" fill="#3a7c31" />
</svg>`,

    birdFlying1: `<svg width="60" height="40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="30" cy="25" rx="20" ry="10" fill="#ffcc00" />
  <circle cx="45" cy="20" r="10" fill="#ffcc00" />
  <polygon points="53,20 60,23 53,26" fill="#ff6600" />
  <circle cx="47" cy="17" r="2" fill="#000" />
  <path d="M 35 20 Q 30 0 20 5 Q 25 15 35 20" fill="#ffaa00" />
</svg>`,

    birdFlying2: `<svg width="60" height="40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="30" cy="25" rx="20" ry="10" fill="#ffcc00" />
  <circle cx="45" cy="20" r="10" fill="#ffcc00" />
  <polygon points="53,20 60,23 53,26" fill="#ff6600" />
  <circle cx="47" cy="17" r="2" fill="#000" />
  <path d="M 35 25 Q 30 40 20 35 Q 25 25 35 25" fill="#ffaa00" />
</svg>`,

    snakeMovingRight1: `<svg width="80" height="40" xmlns="http://www.w3.org/2000/svg">
  <path d="M 10 30 Q 20 20 30 30 T 50 30 T 70 25" fill="none" stroke="#00cc00" stroke-width="8" stroke-linecap="round"/>
  <circle cx="70" cy="25" r="6" fill="#00cc00" />
  <circle cx="72" cy="23" r="1.5" fill="#000" />
  <path d="M 76 25 L 80 25 M 80 25 L 82 23 M 80 25 L 82 27" fill="none" stroke="#ff0000" stroke-width="1" />
</svg>`,

    snakeMovingRight2: `<svg width="80" height="40" xmlns="http://www.w3.org/2000/svg">
  <path d="M 10 30 Q 20 40 30 30 T 50 30 T 70 25" fill="none" stroke="#00cc00" stroke-width="8" stroke-linecap="round"/>
  <circle cx="70" cy="25" r="6" fill="#00cc00" />
  <circle cx="72" cy="23" r="1.5" fill="#000" />
  <path d="M 76 25 L 80 25 M 80 25 L 82 23 M 80 25 L 82 27" fill="none" stroke="#ff0000" stroke-width="1" />
</svg>`,

    snakeCoiled: `<svg width="80" height="40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="35" rx="25" ry="5" fill="#00cc00" />
  <ellipse cx="40" cy="30" rx="20" ry="5" fill="#009900" />
  <ellipse cx="40" cy="25" rx="15" ry="5" fill="#00cc00" />
  <path d="M 40 20 Q 30 10 45 5" fill="none" stroke="#00cc00" stroke-width="8" stroke-linecap="round"/>
  <circle cx="48" cy="5" r="6" fill="#00cc00" />
  <circle cx="50" cy="3" r="1.5" fill="#000" />
  <path d="M 54 5 L 60 5 M 60 5 L 62 3 M 60 5 L 62 7" fill="none" stroke="#ff0000" stroke-width="1" />
</svg>`,

    apple: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="12" r="8" fill="#ff0000" />
  <path d="M 10 4 Q 12 0 15 2" fill="none" stroke="#663300" stroke-width="2" />
  <path d="M 10 8 Q 15 8 13 4 Q 8 4 10 8" fill="#00ff00" />
</svg>`
};

const images = {};
let imagesLoaded = 0;
const totalImages = Object.keys(svgData).length;

function createSvgImage(svgString, key) {
    const img = new Image();
    const svg = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svg);
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            initGame();
        }
        URL.revokeObjectURL(url);
    };
    img.src = url;
    images[key] = img;
}

for (const key in svgData) {
    createSvgImage(svgData[key], key);
}

// Game Logic variables
let canvas, ctx;
let lastTime = 0;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Bird
const bird = {
    x: 400,
    y: 50,
    width: 60,
    height: 40,
    speedX: 100,
    speedY: 50,
    directionX: 1,
    directionY: 1,
    flapTimer: 0,
    isFlappingUp: true,
    moveTimer: 0
};

const SNAKE_COIL_DURATION = 1.0;

// Snake
const snake = {
    x: 0,
    y: GAME_HEIGHT - 40,
    width: 80,
    height: 40,
    speed: 150,
    direction: 1,
    state: 'moving', // 'moving', 'coiled'
    coilTimer: 0,
    wiggleTimer: 0,
    wiggleState: 1 // 1 or 2
};

// Apples
const apples = [];
const appleSpeed = 200;

// Game State
let score = 0;
let gameOver = false;
let gameStatus = ''; // 'win', 'loss'

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    window.addEventListener('keydown', (e) => {
        if (gameOver) return;
        if (e.code === 'Space') {
            // Drop an apple
            apples.push({
                x: bird.x + bird.width / 2 - 10,
                y: bird.y + bird.height,
                width: 20,
                height: 20
            });
        }
    });

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function updateBird(deltaTime) {
    // Bird Movement
    bird.moveTimer += deltaTime;
    if (bird.moveTimer > 1) { // Change direction randomly every second
        bird.directionX = Math.random() > 0.5 ? 1 : -1;
        bird.directionY = Math.random() > 0.5 ? 1 : -1;
        bird.speedX = 50 + Math.random() * 100;
        bird.speedY = 20 + Math.random() * 50;
        bird.moveTimer = 0;
    }

    bird.x += bird.speedX * bird.directionX * deltaTime;
    bird.y += bird.speedY * bird.directionY * deltaTime;

    // Constrain bird to top area
    if (bird.x < 0) { bird.x = 0; bird.directionX = 1; }
    if (bird.x + bird.width > GAME_WIDTH) { bird.x = GAME_WIDTH - bird.width; bird.directionX = -1; }
    if (bird.y < 0) { bird.y = 0; bird.directionY = 1; }
    if (bird.y > GAME_HEIGHT / 3) { bird.y = GAME_HEIGHT / 3; bird.directionY = -1; }

    // Bird animation
    bird.flapTimer += deltaTime;
    if (bird.flapTimer > 0.15) {
        bird.isFlappingUp = !bird.isFlappingUp;
        bird.flapTimer = 0;
    }
}

function updateSnake(deltaTime) {
    // Snake movement
    if (snake.state === 'moving') {
        snake.x += snake.speed * snake.direction * deltaTime;
        if (snake.x + snake.width > GAME_WIDTH) {
            snake.x = GAME_WIDTH - snake.width;
            snake.direction = -1;
        } else if (snake.x < 0) {
            snake.x = 0;
            snake.direction = 1;
        }

        snake.wiggleTimer += deltaTime;
        if (snake.wiggleTimer > 0.15) {
            snake.wiggleState = snake.wiggleState === 1 ? 2 : 1;
            snake.wiggleTimer = 0;
        }
    } else if (snake.state === 'coiled') {
        snake.coilTimer -= deltaTime;
        if (snake.coilTimer <= 0) {
            snake.state = 'moving';
        }
    }
}

function updateApples(deltaTime) {
    // Apples movement
    for (let i = 0; i < apples.length; i++) {
        apples[i].y += appleSpeed * deltaTime;

        // Collision detection with snake
        if (
            apples[i].x < snake.x + snake.width &&
            apples[i].x + apples[i].width > snake.x &&
            apples[i].y < snake.y + snake.height &&
            apples[i].y + apples[i].height > snake.y
        ) {
            if (snake.state !== 'coiled') {
                score++;
                checkGameEnd();
            }
            snake.state = 'coiled';
            snake.coilTimer = SNAKE_COIL_DURATION; // hiss and coil for 1 second
            apples.splice(i, 1);
            i--;
            continue; // move to next apple
        }

        // Remove apples that go off screen (missed snake)
        if (apples[i].y > GAME_HEIGHT) {
            score--;
            apples.splice(i, 1);
            i--;
            checkGameEnd();
        }
    }
}

function update(deltaTime) {
    updateBird(deltaTime);
    updateSnake(deltaTime);
    updateApples(deltaTime);
}

function checkGameEnd() {
    if (score >= 3) {
        gameOver = true;
        gameStatus = 'win';
    } else if (score <= -3) {
        gameOver = true;
        gameStatus = 'loss';
    }
}

function draw() {
    // Background
    ctx.drawImage(images.background, 0, 0);

    // Snake
    let snakeImage;
    if (snake.state === 'coiled') {
        snakeImage = images.snakeCoiled;
    } else {
        snakeImage = snake.wiggleState === 2 ? images.snakeMovingRight2 : images.snakeMovingRight1;
    }

    // Flip snake context if moving left
    ctx.save();
    if (snake.direction === -1 && snake.state !== 'coiled') {
        ctx.translate(snake.x + snake.width, snake.y);
        ctx.scale(-1, 1);
        ctx.drawImage(snakeImage, 0, 0);
    } else {
        ctx.drawImage(snakeImage, snake.x, snake.y);
    }
    ctx.restore();

    // Bird
    const birdImage = bird.isFlappingUp ? images.birdFlying1 : images.birdFlying2;

    // Flip bird if moving left
    ctx.save();
    if (bird.directionX === -1) {
        ctx.translate(bird.x + bird.width, bird.y);
        ctx.scale(-1, 1);
        ctx.drawImage(birdImage, 0, 0);
    } else {
        ctx.drawImage(birdImage, bird.x, bird.y);
    }
    ctx.restore();

    // Apples
    for (let apple of apples) {
        ctx.drawImage(images.apple, apple.x, apple.y);
    }

    // Score
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = gameStatus === 'win' ? '#00ff00' : '#ff0000';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameStatus === 'win' ? 'You Win!' : 'You Lose!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000; // in seconds
    lastTime = timestamp;

    if (!gameOver) {
        update(deltaTime);
    }
    draw();

    requestAnimationFrame(gameLoop);
}

// Expose game state for testing purposes
if (typeof window !== 'undefined') {
    window.gameState = {
        get bird() { return bird; },
        get snake() { return snake; },
        get apples() { return apples; },
        get score() { return score; },
        set score(val) { score = val; },
        get gameOver() { return gameOver; },
        set gameOver(val) { gameOver = val; },
        get gameStatus() { return gameStatus; },
        get checkGameEnd() { return checkGameEnd; },
        get GAME_HEIGHT() { return GAME_HEIGHT; },
        get GAME_WIDTH() { return GAME_WIDTH; },
        get SNAKE_COIL_DURATION() { return SNAKE_COIL_DURATION; }
    };
}
