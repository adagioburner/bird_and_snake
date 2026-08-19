const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Bird and Snake Game Tests', () => {
  let pageUrl;

  test.beforeAll(() => {
    // We can load the page directly from the file system
    pageUrl = `file://${path.resolve(__dirname, '../index.html')}`;
  });

  test('Page loads correctly without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(pageUrl);

    // Check title
    await expect(page).toHaveTitle('Bird and Snake Game');

    // Check canvas exists
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Verify no errors were caught
    expect(errors.length).toBe(0);
  });

  test('The snake wiggles as it moves', async ({ page }) => {
    await page.goto(pageUrl);

    // Track wiggling state
    const wigglingStates = new Set();

    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(100);
        const wiggleState = await page.evaluate(() => window.gameState.snake.wiggleState);
        wigglingStates.add(wiggleState);
    }

    // Verify it wiggles (toggles state)
    expect(wigglingStates.size).toBe(2); // Should have both 1 and 2
    expect(wigglingStates.has(1)).toBeTruthy();
    expect(wigglingStates.has(2)).toBeTruthy();
  });

  test('The snake moves from one side of the screen to the other', async ({ page }) => {
    await page.goto(pageUrl);

    // Initial snake x
    const initialX = await page.evaluate(() => window.gameState.snake.x);

    // Wait for a short duration to let it move
    await page.waitForTimeout(500);

    const nextX = await page.evaluate(() => window.gameState.snake.x);
    expect(nextX).toBeGreaterThan(initialX); // Assuming direction is 1 initially

    // Manually push the snake to the edge to test reversal
    await page.evaluate(() => {
        window.gameState.snake.x = window.gameState.GAME_WIDTH - 10;
        window.gameState.snake.direction = 1;
    });

    await page.waitForTimeout(100);

    const reversedX = await page.evaluate(() => window.gameState.snake.x);
    const reversedDirection = await page.evaluate(() => window.gameState.snake.direction);

    // Direction should flip to -1, so it shouldn't just keep growing indefinitely without limit
    expect(reversedDirection).toBe(-1);

    const gameWidth = await page.evaluate(() => window.gameState.GAME_WIDTH);
    expect(reversedX).toBeLessThanOrEqual(gameWidth);

    // Manually push the snake to the left edge to test reversal
    await page.evaluate(() => {
        window.gameState.snake.x = 0;
        window.gameState.snake.direction = -1;
    });

    await page.waitForTimeout(100);

    const leftReversedX = await page.evaluate(() => window.gameState.snake.x);
    const leftReversedDirection = await page.evaluate(() => window.gameState.snake.direction);

    // Direction should flip to 1
    expect(leftReversedDirection).toBe(1);
    expect(leftReversedX).toBeGreaterThanOrEqual(0);
  });

  test('The bird flies in the top part of the screen and flaps its wings', async ({ page }) => {
    await page.goto(pageUrl);

    // Track y position and flapping state
    const yPositions = [];
    const flappingStates = new Set();

    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(100);
        const { y, isFlappingUp } = await page.evaluate(() => window.gameState.bird);
        yPositions.push(y);
        flappingStates.add(isFlappingUp);
    }

    // Verify Y constraint (the top part, e.g., 0 to GAME_HEIGHT/3 based on code)
    const maxHeight = await page.evaluate(() => window.gameState.GAME_HEIGHT / 3);
    for (const y of yPositions) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(maxHeight);
    }

    // Verify it flaps its wings
    expect(flappingStates.size).toBe(2); // Should have both true and false
    expect(flappingStates.has(true)).toBeTruthy();
    expect(flappingStates.has(false)).toBeTruthy();
  });

  test('The apple is dropped when the space bar is pressed and flies straight down', async ({ page }) => {
    await page.goto(pageUrl);

    // Initial apples count
    const initialCount = await page.evaluate(() => window.gameState.apples.length);
    expect(initialCount).toBe(0);

    // Press spacebar
    await page.keyboard.press('Space');

    // Verify apple was added
    const afterDropCount = await page.evaluate(() => window.gameState.apples.length);
    expect(afterDropCount).toBe(1);

    // Verify it moves straight down
    const initialApple = await page.evaluate(() => window.gameState.apples[0]);

    await page.waitForTimeout(100);

    const movedApple = await page.evaluate(() => window.gameState.apples[0]);

    // X should remain the same, Y should increase
    expect(movedApple.x).toBe(initialApple.x);
    expect(movedApple.y).toBeGreaterThan(initialApple.y);
  });

  test('The snake coils up if it touches the apple, apple disappears, score updates, and snake resumes movement', async ({ page }) => {
    await page.goto(pageUrl);

    // Initial score
    const initialScore = await page.evaluate(() => window.gameState.score);

    // Force a collision
    await page.evaluate(() => {
        window.gameState.snake.x = 400;
        window.gameState.snake.y = 500;
        window.gameState.snake.state = 'moving';

        window.gameState.apples.push({
            x: 400 + 40, // inside snake
            y: 500 + 20, // inside snake
            width: 20,
            height: 20
        });
    });

    // Wait a tick for update loop to process the collision
    await page.waitForTimeout(100);

    // Verify snake is coiled
    const snakeState = await page.evaluate(() => window.gameState.snake.state);
    expect(snakeState).toBe('coiled');

    // Verify apple disappeared
    const applesCount = await page.evaluate(() => window.gameState.apples.length);
    expect(applesCount).toBe(0);

    // Verify score updated (collision with snake increases score)
    const newScore = await page.evaluate(() => window.gameState.score);
    expect(newScore).toBe(initialScore + 1);

    // Wait for coil timer to expire (with a tiny buffer)
    const coilDurationMs = await page.evaluate(() => window.gameState.SNAKE_COIL_DURATION * 1000);
    await page.waitForTimeout(coilDurationMs + 50);

    // Verify snake resumes movement
    const resumedState = await page.evaluate(() => window.gameState.snake.state);
    expect(resumedState).toBe('moving');
  });

  test('The apple is not dropped when the space bar is pressed if the game is over', async ({ page }) => {
    await page.goto(pageUrl);

    // Set game over to true
    await page.evaluate(() => {
        window.gameState.gameOver = true;
    });

    // Initial apples count
    const initialCount = await page.evaluate(() => window.gameState.apples.length);
    expect(initialCount).toBe(0);

    // Press spacebar
    await page.keyboard.press('Space');

    // Verify apple was not added
    const afterDropCount = await page.evaluate(() => window.gameState.apples.length);
    expect(afterDropCount).toBe(0);
  });

  test('The apple disappears at the bottom of the screen and score decreases', async ({ page }) => {
    await page.goto(pageUrl);

    // Prevent game over by boosting initial score internally if we want to ensure it doesn't just stop running
    // Actually, game over just stops input but game loop keeps running without calling update.
    // So we reset game over and ensure score is enough to not trigger game over instantly, or we just rely on one drop.

    await page.evaluate(() => {
        window.gameState.score = 0;
        window.gameState.gameOver = false;

        // Place apple near bottom
        window.gameState.apples.length = 0; // Clear existing
        window.gameState.apples.push({
            x: 100,
            y: window.gameState.GAME_HEIGHT - 10,
            width: 20,
            height: 20
        });
    });

    const initialScore = await page.evaluate(() => window.gameState.score);

    // Wait for apple to fall off screen
    await page.waitForTimeout(200); // Should be enough as speed is 200/s, so 0.2s * 200 = 40px

    // Verify apple disappeared
    const applesCount = await page.evaluate(() => window.gameState.apples.length);
    expect(applesCount).toBe(0);

    // Verify score decreased
    const newScore = await page.evaluate(() => window.gameState.score);
    expect(newScore).toBe(initialScore - 1);
  });

  test('Hitting coiled snake does not change score, removes apple and resets coil timer', async ({ page }) => {
    await page.goto(pageUrl);

    // Initial setup for collision
    await page.evaluate(() => {
        window.gameState.score = 0;
        window.gameState.snake.state = 'coiled';
        window.gameState.snake.coilTimer = 0.5; // Simulate a partially expired timer

        // Place snake and an apple exactly on top of it
        window.gameState.snake.x = 400;
        window.gameState.snake.y = 500;
        window.gameState.apples.length = 0; // Clear existing
        window.gameState.apples.push({
            x: 400 + 40,
            y: 500 + 20,
            width: 20,
            height: 20
        });
    });

    const initialScore = await page.evaluate(() => window.gameState.score);

    // Wait for a tick to let the update loop process the collision
    await page.waitForTimeout(100);

    // Verify snake is still coiled
    const snakeState = await page.evaluate(() => window.gameState.snake.state);
    expect(snakeState).toBe('coiled');

    // Verify coil timer is reset to SNAKE_COIL_DURATION
    const snakeCoilTimer = await page.evaluate(() => window.gameState.snake.coilTimer);
    const coilDuration = await page.evaluate(() => window.gameState.SNAKE_COIL_DURATION);

    // We expect the timer to be roughly coilDuration, minus a tiny bit for the tick time
    // But since it just got reset and ticked, it should be > 0.5 for sure and close to coilDuration.
    expect(snakeCoilTimer).toBeGreaterThan(0.5);
    expect(snakeCoilTimer).toBeLessThanOrEqual(coilDuration);

    // Specifically, if a tick passes, timer is roughly coilDuration - deltaTime.
    // If SNAKE_COIL_DURATION is 1.0, it should be around 0.9.

    // Verify apple disappeared
    const applesCount = await page.evaluate(() => window.gameState.apples.length);
    expect(applesCount).toBe(0);

    // Verify score did not change
    const newScore = await page.evaluate(() => window.gameState.score);
    expect(newScore).toBe(initialScore);
  });

  test('The game ends with a loss when the score reaches -3', async ({ page }) => {
    await page.goto(pageUrl);

    // Drop 3 apples to trigger loss condition
    await page.evaluate(() => {
        window.gameState.gameOver = false;

        // Clear existing apples
        window.gameState.apples.length = 0;

        // Push 3 apples off-screen to quickly drop score
        for(let i=0; i<3; i++) {
            window.gameState.apples.push({
                x: 100 + i*10,
                y: window.gameState.GAME_HEIGHT + 10,
                width: 20,
                height: 20
            });
        }
    });

    // Wait for game loop to process the apples (should only take 1 tick)
    await page.waitForTimeout(100);

    // Verify score is -3
    const newScore = await page.evaluate(() => window.gameState.score);
    expect(newScore).toBe(-3);

    // Verify game is over and status is loss
    const gameOver = await page.evaluate(() => window.gameState.gameOver);
    const gameStatus = await page.evaluate(() => window.gameState.gameStatus);

    expect(gameOver).toBe(true);
    expect(gameStatus).toBe('loss');
  });

  test('The game is won when the score reaches 3', async ({ page }) => {
    await page.goto(pageUrl);

    await page.evaluate(() => {
        window.gameState.score = 3;
        window.gameState.checkGameEnd();
    });

    const isGameOver = await page.evaluate(() => window.gameState.gameOver);
    const status = await page.evaluate(() => window.gameState.gameStatus);

    expect(isGameOver).toBe(true);
    expect(status).toBe('win');
  });

  test('The game is lost when the score reaches -3', async ({ page }) => {
    await page.goto(pageUrl);

    await page.evaluate(() => {
        window.gameState.score = -3;
        window.gameState.checkGameEnd();
    });

    const isGameOver = await page.evaluate(() => window.gameState.gameOver);
    const status = await page.evaluate(() => window.gameState.gameStatus);

    expect(isGameOver).toBe(true);
    expect(status).toBe('loss');
  });
});
