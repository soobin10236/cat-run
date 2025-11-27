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

        // 초기 리사이징을 가장 먼저 수행 (엔티티 생성 전 크기 확정)
        this.resize();

        // this.width/height는 resize()에서 설정됨

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
        this.isUpdateAlertShown = false;
        this.firebaseManager.listenForVersionChange((serverVersion) => {
            if (!this.isUpdateAlertShown && serverVersion !== GAME_VERSION) {
                this.isUpdateAlertShown = true;
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
        this.shareBtn = document.getElementById('share-btn'); // 공유 버튼
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

        // 피드백 관련 UI
        this.feedbackBtn = document.getElementById('feedback-btn');
        this.feedbackModal = document.getElementById('feedback-modal');
        this.feedbackInput = document.getElementById('feedback-input');
        this.sendFeedbackBtn = document.getElementById('send-feedback-btn');
        this.closeFeedbackBtn = document.getElementById('close-feedback-btn');

        // 그룹 관련 UI
        this.groupBtn = document.getElementById('group-btn');
        this.groupModal = document.getElementById('group-modal');
        this.closeGroupModalBtn = document.getElementById('close-group-modal-btn');
        this.createGroupBtn = document.getElementById('create-group-btn');
        this.joinGroupBtn = document.getElementById('join-group-btn');
        this.groupCodeInput = document.getElementById('group-code-input');
        this.leaveGroupBtn = document.getElementById('leave-group-btn');
        this.currentGroupIdSpan = document.getElementById('current-group-id');
        this.filterGlobalBtn = document.getElementById('filter-global-btn');
        this.filterGroupBtn = document.getElementById('filter-group-btn');

        this.bindEvents();

        // 게임 시작 전에도 화면을 그리기 위해 루프 시작 (update는 스킵됨)
        this.isGameStarted = false;
        this.isPaused = false;
        this.distance = 0; // 달린 거리
        this.playTime = 0; // 플레이 시간 (ms)
        this.sessionId = null; // 현재 게임 세션 ID
        this.userId = localStorage.getItem('userId');
        this.groupId = localStorage.getItem('groupId'); // 그룹 ID 로드
        this.rankingFilter = 'global'; // 'global' or 'group'

        // User ID가 없으면 생성
        if (!this.userId) {
            this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', this.userId);
        }

        // 초기 리사이징 및 이벤트 리스너 등록
        // this.resize(); // 위에서 이미 호출됨
        window.addEventListener('resize', () => this.resize());

        this.gameLoop(0);
    }

    /**
     * 캔버스 크기를 화면 영역에 맞게 조정
     */
    resize() {
        const screenArea = document.getElementById('screen-area');
        if (screenArea) {
            this.canvas.width = screenArea.clientWidth;
            this.canvas.height = screenArea.clientHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
    }

    /**
     * 게임 상태 업데이트
     */
    update(deltaTime) {
        deltaTime = Math.min(deltaTime, 1000);

        if (!this.isGameStarted || this.isGameOver || this.isPaused) return;

        this.playTime += deltaTime;

        this.background.update(deltaTime);
        this.player.update(this.input, deltaTime);

        this.floatingMessages.forEach(msg => msg.update(deltaTime));
        this.floatingMessages = this.floatingMessages.filter(msg => !msg.markedForDeletion);

        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);
            const dx = (this.player.x + this.player.width / 2) - projectile.x;
            const dy = (this.player.y + this.player.height / 2) - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 30 + projectile.radius) {
                this.gameOver();
            }
        });
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        if (this.obstacleTimer > this.obstacleInterval) {
            this.obstacles.push(new Obstacle(this));
            this.obstacleTimer = 0;

            const { BASE_INTERVAL, MIN_INTERVAL, SPEED_COEFFICIENT, SCORE_COEFFICIENT, RANDOM_DELAY } = DIFFICULTY_SETTINGS.OBSTACLE;
            const speedReduction = this.gameSpeed * SPEED_COEFFICIENT;
            const scoreReduction = this.score * SCORE_COEFFICIENT;
            const baseInterval = BASE_INTERVAL - speedReduction - scoreReduction;
            const speedRatio = this.gameSpeed / DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL;
            const dynamicMinInterval = MIN_INTERVAL / Math.sqrt(speedRatio);
            const safeInterval = Math.max(baseInterval, dynamicMinInterval);

            this.obstacleInterval = safeInterval + Math.random() * RANDOM_DELAY;
        } else {
            this.obstacleTimer += deltaTime;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(deltaTime);
            if (this.checkCollision(this.player, obstacle)) {
                if (this.player.hitShield()) {
                    this.audioManager.playItemSound();
                    this.floatingMessages.push(
                        new FloatingMessage("BLOCK!", this.player.x, this.player.y, this.player.x, this.player.y - 50, '#00FFFF')
                    );
                    obstacle.markedForDeletion = true;
                } else if (this.player.invincibleTimer > 0) {
                    // 무적
                } else {
                    this.gameOver();
                }
            }
        });
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);

        if (this.itemTimer > this.itemInterval) {
            if (Math.random() < ITEM_CONFIG.SPAWN_CHANCE) {
                const lastObstacle = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1] : null;
                const lastItem = this.items.length > 0 ? this.items[this.items.length - 1] : null;

                const safeDistance = this.width * ITEM_CONFIG.SAFE_DISTANCE_RATIO;
                let canSpawn = true;

                if (lastObstacle && lastObstacle.x > this.width - safeDistance) canSpawn = false;
                if (lastItem && lastItem.x > this.width - safeDistance) canSpawn = false;
                if (this.obstacleInterval - this.obstacleTimer < 300) canSpawn = false;

                if (canSpawn) {
                    const rand = Math.random();
                    let type = ITEM_CONFIG.TYPES.SCORE;
                    if (rand > ITEM_CONFIG.PROBABILITIES.SCORE) {
                        type = ITEM_CONFIG.TYPES.SHIELD;
                    }
                    this.items.push(new Item(this, type));
                }
            }
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
                    this.player.addShield();
                    this.floatingMessages.push(
                        new FloatingMessage("SHIELD!", item.x, item.y, item.x, item.y - 50, '#00FFFF')
                    );
                }
            }
        });
        this.items = this.items.filter(item => !item.markedForDeletion);

        this.score += (this.gameSpeed * deltaTime) * 0.01;
        this.distance += (this.gameSpeed * deltaTime) * 0.001;

        this.updateScoreUI();

        const timeElapsedSeconds = this.playTime / 1000;
        const progress = Math.min(timeElapsedSeconds / DIFFICULTY_SETTINGS.GAME_SPEED.TARGET_TIME_SECONDS, 1.0);
        const easeOutProgress = progress * (2 - progress);
        const speedDiff = DIFFICULTY_SETTINGS.GAME_SPEED.MAX - DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL;
        this.gameSpeed = DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL + (speedDiff * easeOutProgress);
    }

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
        let y = 60;
        const info = [
            `Time: ${(this.playTime / 1000).toFixed(1)}s`,
            `Speed: ${this.gameSpeed.toFixed(2)} / ${DIFFICULTY_SETTINGS.GAME_SPEED.MAX}`,
            `Interval: ${Math.floor(this.obstacleInterval)}ms`,
            `Score: ${Math.floor(this.score)}`
        ];
        info.forEach(text => {
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text, x, y);
            this.ctx.fillText(text, x, y);
            y += 20;
        });
    }

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
        return (aX < bX + bWidth && aX + aWidth > bX && aY < bY + bHeight && aY + aHeight > bY);
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
        if (this.percentileContainer) this.percentileContainer.classList.add('hidden');
        this.updateScoreUI();

        this.background.reset();
        this.player = new Player(this);

        this.audioManager.playBgm();
        this.lastTime = performance.now();
        this.startSession();
    }

    async start() {
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.audioManager.playBgm();
        await this.startSession();
    }

    async startSession() {
        this.sessionId = await this.firebaseManager.startSession(this.userId, GAME_VERSION, this.groupId);
        console.log("Game Session Started:", this.sessionId, "Group:", this.groupId);
    }

    bindEvents() {
        this.restartBtn.addEventListener('click', () => this.restart());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resumeBtn.addEventListener('click', () => this.togglePause());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        this.showLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.leaderboardCloseBtn.addEventListener('click', () => {
            this.leaderboardScreen.classList.add('hidden');
            if (this.isGameOver && !this.isGameStarted) {
                // 시작 화면에서 랭킹 본 경우
            } else if (this.isGameOver) {
                this.gameOverScreen.classList.remove('hidden');
            }
        });
        this.submitScoreBtn.addEventListener('click', () => this.submitScore());

        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', () => this.shareScore());
        }

        this.feedbackBtn.addEventListener('click', () => {
            this.togglePause();
            this.feedbackModal.classList.remove('hidden');
            this.feedbackInput.value = '';
            this.feedbackInput.focus();
        });

        this.closeFeedbackBtn.addEventListener('click', () => {
            this.feedbackModal.classList.add('hidden');
        });

        this.sendFeedbackBtn.addEventListener('click', async () => {
            const message = this.feedbackInput.value.trim();
            if (!message) {
                alert("내용을 입력해주세요!");
                return;
            }
            this.sendFeedbackBtn.disabled = true;
            this.sendFeedbackBtn.innerText = "전송 중...";
            const success = await this.firebaseManager.sendFeedback(message, this.userId);
            if (success) {
                alert("소중한 의견 감사합니다! 🙇‍♂️");
                this.feedbackModal.classList.add('hidden');
            } else {
                alert("전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
            this.sendFeedbackBtn.disabled = false;
            this.sendFeedbackBtn.innerText = "보내기";
        });

        // 그룹 관련 이벤트
        if (this.groupBtn) {
            this.groupBtn.addEventListener('click', () => {
                this.groupModal.classList.remove('hidden');
                this.updateGroupUI();
            });
        }

        if (this.closeGroupModalBtn) {
            this.closeGroupModalBtn.addEventListener('click', () => {
                this.groupModal.classList.add('hidden');
            });
        }

        if (this.createGroupBtn) {
            this.createGroupBtn.addEventListener('click', () => this.createGroup());
        }

        if (this.joinGroupBtn) {
            this.joinGroupBtn.addEventListener('click', () => this.joinGroup());
        }

        if (this.leaveGroupBtn) {
            this.leaveGroupBtn.addEventListener('click', () => this.leaveGroup());
        }

        if (this.filterGlobalBtn && this.filterGroupBtn) {
            this.filterGlobalBtn.addEventListener('click', () => {
                this.rankingFilter = 'global';
                this.filterGlobalBtn.classList.add('active');
                this.filterGroupBtn.classList.remove('active');
                this.showLeaderboard();
            });

            this.filterGroupBtn.addEventListener('click', () => {
                if (!this.groupId) {
                    alert("그룹에 먼저 가입해주세요!");
                    return;
                }
                this.rankingFilter = 'group';
                this.filterGroupBtn.classList.add('active');
                this.filterGlobalBtn.classList.remove('active');
                this.showLeaderboard();
            });
        }

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

        if (this.sessionId) {
            await this.firebaseManager.endSession(this.sessionId, finalScore, finalDistance);
        }

        if (this.percentileContainer && finalScore > 0) {
            this.percentileContainer.classList.remove('hidden');
            this.percentileValue.innerText = "--";
            this.percentileMarker.style.left = "0%";
            this.firebaseManager.calculatePercentile(finalScore).then(percentile => {
                if (percentile) {
                    this.percentileValue.innerText = percentile;
                    this.percentileMarker.style.left = `${percentile}%`;
                }
            });
        }

        const isTopTen = await this.firebaseManager.isTopTen(finalScore, this.groupId);
        if (isTopTen) {
            setTimeout(() => {
                this.gameOverScreen.classList.add('hidden');
                this.nameInputModal.classList.remove('hidden');
                this.playerNameInput.focus();
            }, 1500);
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

    async shareScore() {
        const score = Math.floor(this.score);
        const title = "Cat Run 챌린지! 🐱";
        const text = `내 점수는 ${score}점! 넌 깰 수 있냥? 🐾\n지금 바로 도전해보세요!`;
        const url = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text,
                    url: url
                });
            } catch (error) {
                console.log('공유 실패:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                alert("링크가 클립보드에 복사되었습니다! 친구에게 공유해보세요.");
            } catch (err) {
                alert("공유하기를 지원하지 않는 브라우저입니다.");
            }
        }
    }

    async createGroup() {
        if (confirm("새로운 그룹을 만드시겠습니까?")) {
            const newGroupId = await this.firebaseManager.createGroup(this.userId);
            if (newGroupId) {
                this.groupId = newGroupId;
                localStorage.setItem('groupId', this.groupId);
                alert(`그룹이 생성되었습니다! 코드: ${newGroupId}`);
                this.updateGroupUI();
            } else {
                alert("그룹 생성 실패. 다시 시도해주세요.");
            }
        }
    }

    async joinGroup() {
        const code = this.groupCodeInput.value.trim().toUpperCase();
        if (code.length !== 6) {
            alert("6자리 코드를 입력해주세요.");
            return;
        }

        const success = await this.firebaseManager.joinGroup(code, this.userId);
        if (success) {
            this.groupId = code;
            localStorage.setItem('groupId', this.groupId);
            alert("그룹에 입장했습니다!");
            this.updateGroupUI();
            this.groupCodeInput.value = '';
        } else {
            alert("그룹을 찾을 수 없거나 입장할 수 없습니다.");
        }
    }

    leaveGroup() {
        if (confirm("정말 그룹을 나가시겠습니까?")) {
            this.groupId = null;
            localStorage.removeItem('groupId');
            this.updateGroupUI();
            alert("그룹에서 나갔습니다.");
        }
    }

    updateGroupUI() {
        if (this.groupId) {
            this.currentGroupIdSpan.innerText = this.groupId;
            this.leaveGroupBtn.classList.remove('hidden');
            this.createGroupBtn.disabled = true;
            this.joinGroupBtn.disabled = true;
            this.groupCodeInput.disabled = true;
        } else {
            this.currentGroupIdSpan.innerText = "없음";
            this.leaveGroupBtn.classList.add('hidden');
            this.createGroupBtn.disabled = false;
            this.joinGroupBtn.disabled = false;
            this.groupCodeInput.disabled = false;
        }
    }

    async showLeaderboard() {
        this.gameOverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.remove('hidden');
        this.leaderboardBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

        const targetGroupId = (this.rankingFilter === 'group') ? this.groupId : null;
        const scores = await this.firebaseManager.getTopScores(targetGroupId);

        this.leaderboardBody.innerHTML = '';
        if (scores.length === 0) {
            const msg = targetGroupId ? "그룹 랭킹이 비어있습니다." : "아직 기록이 없습니다.";
            this.leaderboardBody.innerHTML = `<tr><td colspan="4">${msg}</td></tr>`;
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
