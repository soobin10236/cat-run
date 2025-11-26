import { InputHandler } from './utils/InputHandler.js';
import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Item } from './entities/Item.js';
import { Background } from './entities/Background.js';
import { AudioManager } from './utils/AudioManager.js';
import { FirebaseManager } from './utils/FirebaseManager.js';
import { Projectile } from './entities/Projectile.js';
import { GAME_VERSION } from './constants/Version.js';
import { DIFFICULTY_SETTINGS, SPEED_ACCELERATION, DEBUG_MODE } from './constants/GameConfig.js';
import { ITEM_CONFIG } from './constants/ItemConfig.js';
import { FloatingMessage } from './ui/FloatingMessage.js';

/**
 * 게임 매니저 클래스 (GameManager)
 * 게임의 전반적인 상태, 루프, 엔티티 관리, 충돌 처리 등을 담당합니다.
 */
export class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.lastTime = 0; // 마지막 프레임 시간
        this.score = 0; // 현재 점수
        this.isGameOver = false; // 게임 오버 상태

        // 버전 표시
        const versionElement = document.getElementById('game-version');
        if (versionElement) {
            versionElement.innerText = `v${GAME_VERSION}`;
        }

        // 게임 속도 설정
        this.gameSpeed = DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL;

        this.audioManager = new AudioManager(); // 오디오 매니저 인스턴스
        this.input = new InputHandler(); // 입력 처리기
        this.background = new Background(this); // 배경
        this.player = new Player(this); // 플레이어
        this.firebaseManager = new FirebaseManager(); // Firebase 매니저

        // 실시간 버전 체크
        this.firebaseManager.listenForVersionChange((serverVersion) => {
            if (serverVersion !== GAME_VERSION) {
                alert(`새로운 버전(v${serverVersion})이 출시되었습니다! \n확인을 누르면 업데이트를 위해 새로고침합니다.`);
                location.reload();
            }
        });

        this.obstacles = []; // 장애물 배열
        this.items = []; // 아이템 배열
        this.projectiles = []; // 총알 배열
        this.floatingMessages = []; // 플로팅 메시지 배열
        this.obstacleTimer = 0;
        this.obstacleInterval = 2000; // 초기값 (update에서 재계산됨)
        this.itemTimer = 0;
        this.itemInterval = 1000; // 아이템 생성 체크 간격 (ms)

        // UI 요소 가져오기
        this.scoreElement = document.getElementById('score-value');
        this.distanceElement = document.getElementById('distance-value'); // 거리 표시 요소
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn'); // 재개 버튼
        this.muteBtn = document.getElementById('mute-btn');

        // 리더보드 관련 UI
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.leaderboardBody = document.getElementById('leaderboard-body');
        this.showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
        this.leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');

        // 이름 입력 모달 관련 UI
        this.nameInputModal = document.getElementById('name-input-modal');
        this.playerNameInput = document.getElementById('player-name-input');
        this.submitScoreBtn = document.getElementById('submit-score-btn');

        // 퍼센티지 관련 UI
        this.percentileContainer = document.getElementById('percentile-container');
        this.percentileValue = document.getElementById('percentile-value');
        this.percentileMarker = document.getElementById('percentile-marker');

        this.bindEvents();

        // 게임 시작 전에도 화면을 그리기 위해 루프 시작 (update는 스킵됨)
        this.isGameStarted = false;
        this.isPaused = false;
        this.distance = 0; // 달린 거리
        this.playTime = 0; // 플레이 시간 (ms)
        this.sessionId = null; // 현재 게임 세션 ID
        this.userId = localStorage.getItem('userId');

        // User ID가 없으면 생성
        if (!this.userId) {
            this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', this.userId);
        }

        this.gameLoop(0);
    }

    /**
     * 게임 상태 업데이트
     * @param {number} deltaTime - 이전 프레임과의 시간 차이
     */
    update(deltaTime) {
        // deltaTime 캡핑: 비정상적으로 큰 값 제한 (탭 전환 시 방지)
        deltaTime = Math.min(deltaTime, 1000);

        // 게임이 시작되지 않았거나 게임 오버 상태이거나 일시정지 상태면 업데이트 중지
        if (!this.isGameStarted || this.isGameOver || this.isPaused) return;

        this.playTime += deltaTime;

        // 엔티티 업데이트
        this.background.update(deltaTime);
        this.player.update(this.input, deltaTime);

        // 플로팅 메시지 업데이트
        this.floatingMessages.forEach(msg => msg.update(deltaTime));
        this.floatingMessages = this.floatingMessages.filter(msg => !msg.markedForDeletion);

        // 총알 업데이트 및 충돌 처리
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);

            // 플레이어와 총알 충돌 체크 (거리 기반)
            const dx = (this.player.x + this.player.width / 2) - projectile.x;
            const dy = (this.player.y + this.player.height / 2) - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 플레이어 반지름(약 30) + 총알 반지름(6)
            if (distance < 30 + projectile.radius) {
                this.gameOver();
            }
        });
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        // 장애물 처리
        if (this.obstacleTimer > this.obstacleInterval) {
            this.obstacles.push(new Obstacle(this));
            this.obstacleTimer = 0;

            // 다음 장애물 생성 간격 계산
            const { BASE_INTERVAL, MIN_INTERVAL, SPEED_COEFFICIENT, SCORE_COEFFICIENT, RANDOM_DELAY } = DIFFICULTY_SETTINGS.OBSTACLE;

            const speedReduction = this.gameSpeed * SPEED_COEFFICIENT;
            const scoreReduction = this.score * SCORE_COEFFICIENT;

            const baseInterval = BASE_INTERVAL - speedReduction - scoreReduction;
            const safeInterval = Math.max(baseInterval, MIN_INTERVAL);

            this.obstacleInterval = safeInterval + Math.random() * RANDOM_DELAY;
        } else {
            this.obstacleTimer += deltaTime;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(deltaTime);
            if (this.checkCollision(this.player, obstacle)) {
                // 쉴드가 있으면 방어 시도
                if (this.player.hitShield()) {
                    this.audioManager.playItemSound(); // 방어 효과음

                    // 방어 메시지
                    this.floatingMessages.push(
                        new FloatingMessage("BLOCK!", this.player.x, this.player.y, this.player.x, this.player.y - 50, '#00FFFF')
                    );

                    // 장애물 제거
                    obstacle.markedForDeletion = true;
                } else if (this.player.invincibleTimer > 0) {
                    // 일시 무적 상태면 그냥 통과 (데미지 없음)
                } else {
                    this.gameOver();
                }
            }
        });
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);

        // 아이템 처리
        if (this.itemTimer > this.itemInterval) {
            // 생성 주기 도달
            if (Math.random() < ITEM_CONFIG.SPAWN_CHANCE) {
                const lastObstacle = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1] : null;
                const lastItem = this.items.length > 0 ? this.items[this.items.length - 1] : null;

                const safeDistance = this.width * ITEM_CONFIG.SAFE_DISTANCE_RATIO;
                let canSpawn = true;

                // 마지막 장애물과의 거리 체크
                if (lastObstacle && lastObstacle.x > this.width - safeDistance) {
                    canSpawn = false;
                }
                // 마지막 아이템과의 거리 체크 (연속 뭉침 방지)
                if (lastItem && lastItem.x > this.width - safeDistance) {
                    canSpawn = false;
                }

                // 장애물 생성 예정 시간과 너무 가까우면 생성 금지 (겹침 방지)
                if (this.obstacleInterval - this.obstacleTimer < 300) { // 0.3초 이내 장애물 생성 예정이면 스킵
                    canSpawn = false;
                }

                if (canSpawn) {
                    // 확률에 따라 아이템 타입 결정
                    const rand = Math.random();
                    let type = ITEM_CONFIG.TYPES.SCORE;
                    if (rand > ITEM_CONFIG.PROBABILITIES.SCORE) {
                        type = ITEM_CONFIG.TYPES.SHIELD;
                    }
                    this.items.push(new Item(this, type));
                }
            }

            // 다음 생성 시간 랜덤 설정
            this.itemTimer = 0;
            this.itemInterval = Math.random() * (ITEM_CONFIG.SPAWN_INTERVAL_MAX - ITEM_CONFIG.SPAWN_INTERVAL_MIN) + ITEM_CONFIG.SPAWN_INTERVAL_MIN;
        } else {
            this.itemTimer += deltaTime;
        }

        this.items.forEach(item => {
            item.update(deltaTime);
            if (this.checkCollision(this.player, item)) {
                item.markedForDeletion = true;
                this.audioManager.playItemSound();

                if (item.type === ITEM_CONFIG.TYPES.SCORE) {
                    this.score += 100;
                    this.floatingMessages.push(
                        new FloatingMessage("+100", item.x, item.y, item.x, item.y - 50, '#FFFF00')
                    );
                } else if (item.type === ITEM_CONFIG.TYPES.SHIELD) {
                    this.player.addShield(); // 쉴드 추가
                    this.floatingMessages.push(
                        new FloatingMessage("SHIELD!", item.x, item.y, item.x, item.y - 50, '#00FFFF')
                    );
                }
            }
        });
        this.items = this.items.filter(item => !item.markedForDeletion);

        // 점수 증가
        this.score += (this.gameSpeed * deltaTime) * 0.01;
        // 거리 증가 (게임 속도 * 시간)
        this.distance += (this.gameSpeed * deltaTime) * 0.001;

        this.updateScoreUI();

        // 게임 속도 계산 (비선형 Ease-out 방식)
        // 초반에 빠르게 증가하고 후반에 완만하게 증가
        const timeElapsedSeconds = this.playTime / 1000;
        const progress = Math.min(timeElapsedSeconds / DIFFICULTY_SETTINGS.GAME_SPEED.TARGET_TIME_SECONDS, 1.0);

        // Ease-out Quad 공식: t * (2 - t)
        const easeOutProgress = progress * (2 - progress);

        const speedDiff = DIFFICULTY_SETTINGS.GAME_SPEED.MAX - DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL;
        this.gameSpeed = DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL + (speedDiff * easeOutProgress);
    }

    /**
     * 화면 그리기
     */
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.background.draw(this.ctx);
        this.player.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        this.items.forEach(item => item.draw(this.ctx));
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        this.floatingMessages.forEach(msg => msg.draw(this.ctx));

        if (DEBUG_MODE) {
            this.drawDebugInfo();
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const x = 10;
        let y = 60; // 점수 표시 아래쪽

        const info = [
            `Time: ${(this.playTime / 1000).toFixed(1)}s`,
            `Speed: ${this.gameSpeed.toFixed(2)} / ${DIFFICULTY_SETTINGS.GAME_SPEED.MAX}`,
            `Interval: ${Math.floor(this.obstacleInterval)}ms`,
            `Score: ${Math.floor(this.score)}`
        ];

        info.forEach(text => {
            // 가독성을 위해 흰색 테두리 추가
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text, x, y);
            this.ctx.fillText(text, x, y);
            y += 20;
        });
    }

    /**
     * 충돌 감지 (AABB 방식)
     */
    checkCollision(a, b) {
        let scaleX = 0.6;
        let scaleY = 0.6;

        if (b instanceof Item) {
            scaleX = 0.8;
            scaleY = 0.8;
        } else if (b instanceof Obstacle) {
            if (b.isAnimated) {
                scaleY = 0.4;
            } else {
                scaleX = 0.7;
            }
        }

        const aWidth = a.width * 0.5;
        const aHeight = a.height * 0.5;

        const bWidth = b.width * scaleX;
        const bHeight = b.height * scaleY;

        const aX = a.x + (a.width - aWidth) / 2;
        const aY = a.y + (a.height - aHeight) / 2;
        const bX = b.x + (b.width - bWidth) / 2;
        const bY = b.y + (b.height - bHeight) / 2;

        return (
            aX < bX + bWidth &&
            aX + aWidth > bX &&
            aY < bY + bHeight &&
            aY + aHeight > bY
        );
    }

    restart() {
        this.isGameOver = false;
        this.score = 0;
        this.distance = 0;
        this.playTime = 0;
        this.gameSpeed = DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL;
        this.obstacles = [];
        this.items = [];
        this.projectiles = [];
        this.floatingMessages = [];
        this.obstacleTimer = 0;
        this.itemTimer = 0;

        this.gameOverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        this.nameInputModal.classList.add('hidden');
        if (this.percentileContainer) this.percentileContainer.classList.add('hidden'); // 재시작 시 숨김
        this.updateScoreUI();

        this.background = new Background(this);
        this.player = new Player(this);

        this.audioManager.playBgm();
        this.lastTime = performance.now();

        // 재시작 시 새로운 세션 시작
        this.startSession();
    }

    async start() {
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.audioManager.playBgm();

        // 게임 시작 시 세션 생성
        await this.startSession();
    }

    async startSession() {
        this.sessionId = await this.firebaseManager.startSession(this.userId, GAME_VERSION);
        console.log("Game Session Started:", this.sessionId);
    }

    bindEvents() {
        this.restartBtn.addEventListener('click', () => this.restart());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resumeBtn.addEventListener('click', () => this.togglePause()); // Resume 버튼 연결
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        this.showLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.leaderboardCloseBtn.addEventListener('click', () => {
            this.leaderboardScreen.classList.add('hidden');
            // 게임 오버 상태라면 게임 오버 화면을 다시 보여줌
            if (this.isGameOver && !this.isGameStarted) {
                // 시작 화면에서 랭킹 본 경우 (처리 필요)
            } else if (this.isGameOver) {
                this.gameOverScreen.classList.remove('hidden');
            }
        });
        this.submitScoreBtn.addEventListener('click', () => this.submitScore());

        window.addEventListener('keydown', (e) => {
            if (this.isGameOver && e.key.toLowerCase() === 'r') {
                if (this.nameInputModal.classList.contains('hidden') &&
                    this.leaderboardScreen.classList.contains('hidden')) {
                    this.restart();
                }
            }
            if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isGameStarted && !this.isGameOver && !this.isPaused) {
                    this.togglePause();
                }
            }
        });
    }

    gameLoop(timestamp) {
        if (!timestamp) timestamp = performance.now();
        let deltaTime = timestamp - this.lastTime;
        if (isNaN(deltaTime) || deltaTime < 0) {
            deltaTime = 16.67;
        }
        this.lastTime = timestamp;
        this.update(deltaTime);
        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateScoreUI() {
        this.scoreElement.innerText = Math.floor(this.score);
        if (this.distanceElement) {
            this.distanceElement.innerText = Math.floor(this.distance);
        }
    }

    async gameOver() {
        this.isGameOver = true;
        this.gameOverScreen.classList.remove('hidden');
        const finalScore = Math.floor(this.score);
        const finalDistance = Math.floor(this.distance);
        this.finalScoreElement.innerText = finalScore;
        this.audioManager.stopBgm();
        this.audioManager.playGameOverSound();

        // 세션 종료 및 기록 업데이트
        if (this.sessionId) {
            await this.firebaseManager.endSession(this.sessionId, finalScore, finalDistance);
        }

        // 상위 % 계산 및 표시
        if (this.percentileContainer && finalScore > 0) {
            this.percentileContainer.classList.remove('hidden');
            this.percentileValue.innerText = "--";
            this.percentileMarker.style.left = "0%";

            // 비동기로 계산
            this.firebaseManager.calculatePercentile(finalScore).then(percentile => {
                if (percentile) {
                    this.percentileValue.innerText = percentile;
                    // 상위 1% -> left: 0%, 상위 99% -> left: 100%
                    // percentile은 0.1 ~ 100 사이 값
                    // UI상 왼쪽이 상위권(0%)이므로, left 값은 (percentile)% 가 적절함
                    // 예: 상위 10% -> 왼쪽에서 10% 지점
                    this.percentileMarker.style.left = `${percentile}%`;
                }
            });
        }

        const isTopTen = await this.firebaseManager.isTopTen(finalScore);
        if (isTopTen) {
            setTimeout(() => {
                this.gameOverScreen.classList.add('hidden');
                this.nameInputModal.classList.remove('hidden');
                this.playerNameInput.focus();
            }, 1500); // 퍼센티지 볼 시간 조금 더 줌
        } else {
            // 랭킹권이 아니면 그냥 둠 (이미 endSession에서 기록됨)
        }
    }

    async submitScore() {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            alert("이름을 입력해주세요!");
            return;
        }
        if (name.length > 10) {
            alert("이름은 10자 이내로 입력해주세요.");
            return;
        }

        this.submitScoreBtn.disabled = true;
        this.submitScoreBtn.innerText = "저장 중...";

        // 이미 생성된 세션에 이름만 업데이트
        const success = await this.firebaseManager.updatePlayerName(this.sessionId, name);

        if (success) {
            this.nameInputModal.classList.add('hidden');
            this.showLeaderboard();
        } else {
            alert("점수 저장에 실패했습니다. 다시 시도해주세요.");
        }

        this.submitScoreBtn.disabled = false;
        this.submitScoreBtn.innerText = "등록";
        this.playerNameInput.value = "";
    }

    async showLeaderboard() {
        this.gameOverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.remove('hidden');
        this.leaderboardBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

        const scores = await this.firebaseManager.getTopScores();

        this.leaderboardBody.innerHTML = '';
        if (scores.length === 0) {
            this.leaderboardBody.innerHTML = '<tr><td colspan="4">아직 기록이 없습니다. 첫 번째 주인공이 되어보세요!</td></tr>';
            return;
        }

        scores.forEach((entry, index) => {
            const row = document.createElement('tr');
            let dateStr = entry.date || '-';
            if (entry.timestamp && entry.timestamp.toDate) {
                dateStr = entry.timestamp.toDate().toLocaleDateString();
            }
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.playerName}</td>
                <td>${entry.score}</td>
                <td>${dateStr}</td>
            `;
            this.leaderboardBody.appendChild(row);
        });
    }

    togglePause() {
        if (!this.isGameStarted || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseOverlay.classList.remove('hidden');
            this.pauseBtn.innerText = '▶️';
            this.audioManager.pauseBgm();
        } else {
            this.pauseOverlay.classList.add('hidden');
            this.pauseBtn.innerText = '⏸️';
            this.pauseBtn.blur();
            this.audioManager.resumeBgm();
            this.lastTime = performance.now();
        }
    }

    toggleMute() {
        const isMuted = this.audioManager.toggleMute();
        this.muteBtn.innerText = isMuted ? '🔇' : '🔊';
        this.muteBtn.blur();
        if (!isMuted && this.lastTime > 0 && !this.isGameOver) {
            this.audioManager.playBgm();
        }
    }
}
