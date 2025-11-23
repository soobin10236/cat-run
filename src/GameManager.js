import { InputHandler } from './utils/InputHandler.js';
import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Item } from './entities/Item.js';
import { Background } from './entities/Background.js';
import { AudioManager } from './utils/AudioManager.js';
import { FirebaseManager } from './utils/FirebaseManager.js';
import { Projectile } from './entities/Projectile.js';
import { GAME_VERSION } from './constants/Version.js';

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
        this.MAX_GAME_SPEED = 4.5; // 최대 게임 속도 제한 (눈의 피로 방지)
        this.gameSpeed = 3; // 초기 게임 속도

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
        this.obstacleTimer = 0;
        this.obstacleInterval = 2000; // 장애물 생성 간격 (ms)
        this.itemTimer = 0;
        this.itemInterval = 1000; // 아이템 생성 체크 간격 (ms)

        // UI 요소 가져오기
        this.scoreElement = document.getElementById('score-value');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
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

        this.bindEvents();

        // 게임 시작 전에도 화면을 그리기 위해 루프 시작 (update는 스킵됨)
        this.isGameStarted = false;
        this.isPaused = false;
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

        // 엔티티 업데이트
        this.background.update(deltaTime);
        this.player.update(this.input, deltaTime);

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
            const speedReduction = this.gameSpeed * 250;
            const scoreReduction = this.score * 0.1;
            const baseInterval = 2300 - speedReduction - scoreReduction;
            const safeInterval = Math.max(baseInterval, 500);
            this.obstacleInterval = safeInterval + Math.random() * 500;
        } else {
            this.obstacleTimer += deltaTime;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(deltaTime);
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
            }
        });
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);

        // 아이템 처리
        if (this.itemTimer > 200) {
            if (Math.random() < 0.2) {
                const lastObstacle = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1] : null;
                const safeDistance = 150;
                let canSpawn = true;

                if (lastObstacle && lastObstacle.x > this.width - safeDistance) {
                    canSpawn = false;
                }
                if (this.obstacleInterval - this.obstacleTimer < 300) {
                    canSpawn = false;
                }

                if (canSpawn) {
                    this.items.push(new Item(this));
                }
            }
            this.itemTimer = 0;
        } else {
            this.itemTimer += deltaTime;
        }

        this.items.forEach(item => {
            item.update(deltaTime);
            if (this.checkCollision(this.player, item)) {
                item.markedForDeletion = true;
                this.score += 100;
                this.audioManager.playItemSound();
            }
        });
        this.items = this.items.filter(item => !item.markedForDeletion);

        // 점수 증가
        this.score += (this.gameSpeed * deltaTime) * 0.01;
        this.updateScoreUI();

        // 게임 속도 점진적 증가
        if (this.gameSpeed < this.MAX_GAME_SPEED) {
            this.gameSpeed += 0.001;
        }
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
        this.gameSpeed = 3;
        this.obstacles = [];
        this.items = [];
        this.projectiles = [];
        this.obstacleTimer = 0;
        this.itemTimer = 0;

        this.gameOverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        this.nameInputModal.classList.add('hidden');
        this.updateScoreUI();

        this.background = new Background(this);
        this.player = new Player(this);

        this.audioManager.playBgm();
        this.lastTime = performance.now();
    }

    start() {
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.audioManager.playBgm();
    }

    bindEvents() {
        this.restartBtn.addEventListener('click', () => this.restart());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        this.showLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.leaderboardCloseBtn.addEventListener('click', () => {
            this.leaderboardScreen.classList.add('hidden');
            this.gameOverScreen.classList.remove('hidden');
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
    }

    async gameOver() {
        this.isGameOver = true;
        this.gameOverScreen.classList.remove('hidden');
        const finalScore = Math.floor(this.score);
        this.finalScoreElement.innerText = finalScore;
        this.audioManager.stopBgm();
        this.audioManager.playGameOverSound();

        const isTopTen = await this.firebaseManager.isTopTen(finalScore);
        if (isTopTen) {
            setTimeout(() => {
                this.gameOverScreen.classList.add('hidden');
                this.nameInputModal.classList.remove('hidden');
                this.playerNameInput.focus();
            }, 500);
        } else {
            this.firebaseManager.saveScore('Anonymous', finalScore);
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

        const score = Math.floor(this.score);
        this.submitScoreBtn.disabled = true;
        this.submitScoreBtn.innerText = "저장 중...";

        const success = await this.firebaseManager.saveScore(name, score);

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
