document.addEventListener('DOMContentLoaded', () => {
    const gameBoardCanvas = document.getElementById('game-board');
    const context = gameBoardCanvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextContext = nextCanvas.getContext('2d');
    const holdCanvas = document.getElementById('hold-canvas');
    const holdContext = holdCanvas.getContext('2d');

    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');

    const gameOverOverlay = document.getElementById('game-over');
    const pauseOverlay = document.getElementById('pause');
    const restartButton = document.getElementById('restart-button');

    // --- ゲームの定数 ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const PREVIEW_BLOCK_SIZE = 20;

    // --- ゲームの状態 ---
    let board;
    let currentPiece;
    let nextPiece;
    let holdPiece;
    let canHold;
    let score;
    let lines;
    let level;
    let gameOver;
    let paused;
    let gameLoop;

    // --- テトロミノの定義 ---
    const TETROMINOS = {
        'I': {
            shape: [[1, 1, 1, 1]],
            color: '#00ffff', // Cyan
        },
        'O': {
            shape: [[1, 1], [1, 1]],
            color: '#ffff00', // Yellow
        },
        'T': {
            shape: [[0, 1, 0], [1, 1, 1]],
            color: '#ff00ff', // Purple
        },
        'S': {
            shape: [[0, 1, 1], [1, 1, 0]],
            color: '#00ff00', // Green
        },
        'Z': {
            shape: [[1, 1, 0], [0, 1, 1]],
            color: '#ff0000', // Red
        },
        'J': {
            shape: [[1, 0, 0], [1, 1, 1]],
            color: '#0000ff', // Blue
        },
        'L': {
            shape: [[0, 0, 1], [1, 1, 1]],
            color: '#ff7f00', // Orange
        }
    };

    const PIECE_KEYS = Object.keys(TETROMINOS);

    // --- 初期化処理 ---
    function init() {
        // ゲームボードの初期化
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

        // ゲーム状態の初期化
        score = 0;
        lines = 0;
        level = 1;
        gameOver = false;
        paused = false;
        canHold = true;
        holdPiece = null;

        // 最初のピースと次のピースを生成
        nextPiece = createPiece();
        currentPiece = createPiece();

        // UIの更新
        updateUI();
        draw();

        // ゲームオーバー画面とポーズ画面を非表示
        gameOverOverlay.style.display = 'none';
        pauseOverlay.style.display = 'none';

        // ゲームループの開始
        startGameLoop();
    }

    // --- ゲームループ ---
    function startGameLoop() {
        const speed = 1000 - (level - 1) * 50;
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(() => {
            if (!paused && !gameOver) {
                drop();
            }
        }, Math.max(100, speed));
    }

    // --- ピースの生成 ---
    function createPiece() {
        const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
        const piece = TETROMINOS[key];
        return {
            key: key,
            shape: JSON.parse(JSON.stringify(piece.shape)), // Deep copy
            color: piece.color,
            x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }

    // --- 描画処理 ---
    function draw() {
        // ボードのクリア
        context.clearRect(0, 0, gameBoardCanvas.width, gameBoardCanvas.height);
        context.fillStyle = '#000';
        context.fillRect(0, 0, gameBoardCanvas.width, gameBoardCanvas.height);

        // 固定されたブロックの描画
        drawBoard();
        // 現在のピースの描画
        drawPiece(currentPiece, context, BLOCK_SIZE);
        // グリッド線の描画
        drawGrid();
        // NextとHoldの描画
        drawPreviews();
    }

    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    context.fillStyle = board[y][x];
                    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeStyle = '#000';
                    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    function drawPiece(piece, ctx, blockSize) {
        ctx.fillStyle = piece.color;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillRect((piece.x + x) * blockSize, (piece.y + y) * blockSize, blockSize, blockSize);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect((piece.x + x) * blockSize, (piece.y + y) * blockSize, blockSize, blockSize);
                }
            });
        });
    }

    function drawGrid() {
        context.strokeStyle = '#2c2c2c';
        for (let x = 0; x < COLS; x++) {
            context.beginPath();
            context.moveTo(x * BLOCK_SIZE, 0);
            context.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            context.stroke();
        }
        for (let y = 0; y < ROWS; y++) {
            context.beginPath();
            context.moveTo(0, y * BLOCK_SIZE);
            context.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            context.stroke();
        }
    }

    function drawPreviews() {
        // Next
        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextContext.fillStyle = '#000';
        nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextPiece) {
            const previewPiece = { ...nextPiece, x: 0, y: 0 };
            // Center the piece
            const offsetX = (nextCanvas.width - previewPiece.shape[0].length * PREVIEW_BLOCK_SIZE) / 2;
            const offsetY = (nextCanvas.height - previewPiece.shape.length * PREVIEW_BLOCK_SIZE) / 2;
            previewPiece.x = offsetX / PREVIEW_BLOCK_SIZE;
            previewPiece.y = offsetY / PREVIEW_BLOCK_SIZE;
            drawPiece(previewPiece, nextContext, PREVIEW_BLOCK_SIZE);
        }

        // Hold
        holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        holdContext.fillStyle = '#000';
        holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (holdPiece) {
            const previewPiece = { ...holdPiece, x: 0, y: 0 };
            // Center the piece
            const offsetX = (holdCanvas.width - previewPiece.shape[0].length * PREVIEW_BLOCK_SIZE) / 2;
            const offsetY = (holdCanvas.height - previewPiece.shape.length * PREVIEW_BLOCK_SIZE) / 2;
            previewPiece.x = offsetX / PREVIEW_BLOCK_SIZE;
            previewPiece.y = offsetY / PREVIEW_BLOCK_SIZE;
            drawPiece(previewPiece, holdContext, PREVIEW_BLOCK_SIZE);
        }
    }

    // --- UI更新 ---
    function updateUI() {
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;
    }

    // --- ゲームロジック（落下） ---
    function drop() {
        if (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = createPiece();
            canHold = true; // Allow hold for the new piece

            if (checkCollision(currentPiece, 0, 0)) {
                // Game Over
                gameOver = true;
                clearInterval(gameLoop);
                gameOverOverlay.style.display = 'flex';
            }
        }
        draw();
    }

    // --- 衝突判定 ---
    function checkCollision(piece, offsetX, offsetY) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + offsetX;
                    const newY = piece.y + y + offsetY;

                    if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- ピースの固定 ---
    function lockPiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardX = currentPiece.x + x;
                    const boardY = currentPiece.y + y;
                    if (boardY >= 0) { // Don't lock pieces above the board
                        board[boardY][boardX] = currentPiece.color;
                    }
                }
            });
        });
    }

    // --- ライン消去 ---
    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                linesCleared++;
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                y++; // Re-check the same row index as it's now a new row
            }
        }

        if (linesCleared > 0) {
            // スコア計算
            const lineScores = [0, 100, 300, 500, 800];
            score += lineScores[linesCleared] * level;
            lines += linesCleared;

            // レベルアップ
            if (Math.floor(lines / 10) + 1 > level) {
                level = Math.floor(lines / 10) + 1;
                startGameLoop(); // Update speed
            }

            updateUI();
        }
    }

    // --- 回転 ---
    function rotate() {
        if (currentPiece.key === 'O') return; // O-shape doesn't rotate

        const originalShape = JSON.parse(JSON.stringify(currentPiece.shape));
        const rotatedShape = [];
        const n = originalShape.length;
        const m = originalShape[0].length;

        for (let i = 0; i < m; i++) {
            rotatedShape[i] = [];
            for (let j = 0; j < n; j++) {
                rotatedShape[i][j] = originalShape[n - 1 - j][i];
            }
        }

        const originalX = currentPiece.x;
        const originalY = currentPiece.y;

        const testOffsets = [
            [0, 0], // No offset
            [-1, 0], // Left 1
            [1, 0], // Right 1
            [-2, 0], // Left 2
            [2, 0], // Right 2
            [0, -1], // Up 1 (for I-piece wall kicks)
        ];

        for (const [offsetX, offsetY] of testOffsets) {
            currentPiece.shape = rotatedShape;
            currentPiece.x += offsetX;
            currentPiece.y += offsetY;

            if (!checkCollision(currentPiece, 0, 0)) {
                draw();
                return; // Rotation successful
            }

            // Reset for next test
            currentPiece.x = originalX;
            currentPiece.y = originalY;
        }

        // If all kicks fail, revert to original shape
        currentPiece.shape = originalShape;
    }

    // --- ホールド ---
    function hold() {
        if (!canHold) return;

        if (holdPiece) {
            const temp = currentPiece;
            currentPiece = holdPiece;
            holdPiece = temp;
            currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
            currentPiece.y = 0;
        } else {
            holdPiece = currentPiece;
            currentPiece = nextPiece;
            nextPiece = createPiece();
        }
        canHold = false;
        draw();
        drawPreviews();
    }

    // --- キー操作 ---
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;

        if (e.code === 'KeyP') {
            paused = !paused;
            pauseOverlay.style.display = paused ? 'flex' : 'none';
            if (!paused) {
                draw(); // Redraw the state when unpausing
            }
            return;
        }

        if (paused) return;

        switch (e.code) {
            case 'ArrowLeft':
                if (!checkCollision(currentPiece, -1, 0)) {
                    currentPiece.x--;
                    draw();
                }
                break;
            case 'ArrowRight':
                if (!checkCollision(currentPiece, 1, 0)) {
                    currentPiece.x++;
                    draw();
                }
                break;
            case 'ArrowDown':
                drop();
                break;
            case 'ArrowUp':
                rotate();
                break;
            case 'Space':
                while (!checkCollision(currentPiece, 0, 1)) {
                    currentPiece.y++;
                }
                lockPiece();
                clearLines();
                currentPiece = nextPiece;
                nextPiece = createPiece();
                canHold = true;
                if (checkCollision(currentPiece, 0, 0)) {
                    gameOver = true;
                    clearInterval(gameLoop);
                    gameOverOverlay.style.display = 'flex';
                }
                draw();
                break;
            case 'KeyC':
                hold();
                break;
        }
    });

    // --- リスタートボタン ---
    restartButton.addEventListener('click', () => {
        init();
    });

    // --- ゲーム開始 ---
    init();
});