import { InputHandler } from './utils/InputHandler.js';
import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Item } from './entities/Item.js';
import { Background } from './entities/Background.js';
import { AudioManager } from './utils/AudioManager.js';
import { FirebaseManager } from './utils/FirebaseManager.js';

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

        // [테스트용] 시작부터 최고 속도로 설정하려면 아래 주석을 해제하세요.
        // this.gameSpeed = this.MAX_GAME_SPEED;

        this.audioManager = new AudioManager(); // 오디오 매니저 인스턴스
        this.input = new InputHandler(); // 입력 처리기
        this.background = new Background(this); // 배경
        this.player = new Player(this); // 플레이어
        this.firebaseManager = new FirebaseManager(); // Firebase 매니저

        // 실시간 버전 체크
        this.firebaseManager.listenForVersionChange((serverVersion) => {
            console.log(`Server version: ${serverVersion}`);
            console.log(`Client version: ${GAME_VERSION}`);
            if (serverVersion !== GAME_VERSION) {
                // 버전이 다르면 알림 표시 후 새로고침
                // 게임 중 방해되지 않도록 게임 오버 상태이거나 시작 전일 때만 체크하거나
                // 긴급 패치라면 즉시 중단시킬 수도 있음. 여기서는 alert로 처리
                alert(`새로운 버전(v${serverVersion})이 출시되었습니다! \n확인을 누르면 업데이트를 위해 새로고침합니다.`);
                location.reload();
            }
        });

        this.obstacles = []; // 장애물 배열
        this.items = []; // 아이템 배열
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

        // 장애물 처리
        if (this.obstacleTimer > this.obstacleInterval) {
            this.obstacles.push(new Obstacle(this));
            this.obstacleTimer = 0;

            // 다음 장애물 생성 간격 계산 (난이도 재조정: 원래 버전보다 30% 정도 완화)
            // 1. 속도에 따른 감소 (계수 250으로 설정 - 원래 350보다 완화, 이전 100보다 강화)
            const speedReduction = this.gameSpeed * 250;

            // 2. 점수에 따른 추가 감소
            const scoreReduction = this.score * 0.1;

            // 기본값을 2300으로 설정 (원래 2200보다 약간 여유, 이전 2500보다 빡빡하게)
            const baseInterval = 2300 - speedReduction - scoreReduction;

            // 최소 간격 500ms (0.5초) 보장 - 원래 300ms보다 여유, 이전 800ms보다 빡빡하게
            const safeInterval = Math.max(baseInterval, 500);

            // 랜덤성 500ms 추가
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
        // 화면 밖으로 나간 장애물 제거
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);

        // 아이템 처리
        if (this.itemTimer > 200) { // 체크 간격 대폭 단축 (0.2초마다 확인)
            // 20% 확률로 아이템 생성 시도 (자주 체크하므로 확률은 낮춤)
            if (Math.random() < 0.2) {
                // [충돌 방지] 조건 대폭 완화
                const lastObstacle = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1] : null;

                // 안전 거리: 장애물 너비(약 100)만큼만 떨어지면 생성 (버퍼 제거)
                const safeDistance = 150;

                let canSpawn = true;

                // 1. 마지막 장애물과의 거리 확인
                // 장애물이 화면에 막 등장했을 때만 피하면 됨
                if (lastObstacle && lastObstacle.x > this.width - safeDistance) {
                    canSpawn = false;
                }

                // 2. 다음 장애물 생성까지 남은 시간 확인
                // 0.3초(300ms)만 있으면 생성 허용 (기존 800ms -> 300ms)
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
                this.score += 100; // 보너스 점수(100점)
                this.audioManager.playItemSound(); // 아이템 획득 효과음
            }
        });
        // 획득하거나 화면 밖으로 나간 아이템 제거
        this.items = this.items.filter(item => !item.markedForDeletion);

        // 점수 증가 (거리에 비례)
        this.score += (this.gameSpeed * deltaTime) * 0.01;
        this.updateScoreUI();

        // 게임 속도 점진적 증가 (최대 속도 제한)
        if (this.gameSpeed < this.MAX_GAME_SPEED) {
            this.gameSpeed += 0.001;
        }
    }

    /**
     * 화면 그리기
     */
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 배경 먼저 그리기
        this.background.draw(this.ctx);

        // 엔티티 그리기
        this.player.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        this.items.forEach(item => item.draw(this.ctx));
    }

    /**
     * 충돌 감지 (AABB 방식) - 히트박스 크기 조정
     */
    checkCollision(a, b) {
        // 히트박스 크기 조절
        // 아이템은 획득하기 쉽게 80%, 장애물은 피하기 쉽게 60% 적용
        let scaleX = 0.6;
        let scaleY = 0.6;

        if (b instanceof Item) {
            scaleX = 0.8;
            scaleY = 0.8;
        } else if (b instanceof Obstacle) {
            // 장애물인 경우
            if (b.isAnimated) {
                // 공중 장애물(드론)은 위아래가 납작하므로 y축 히트박스를 대폭 줄임 (30%)
                scaleY = 0.4;
            } else {
                // 지상 장애물은 x축 히트박스를 70%로 설정 (점프로 넘어가기 쉽게)
                scaleX = 0.7;
            }
        }

        const aWidth = a.width * 0.5; // 플레이어 히트박스는 50%로 축소
        const aHeight = a.height * 0.5;

        const bWidth = b.width * scaleX;
        const bHeight = b.height * scaleY;

        // 히트박스 위치 보정 (중앙 정렬)
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

    /**
     * 게임 재시작
     * 상태를 초기화하고 게임을 다시 시작합니다.
     */
    restart() {
        this.isGameOver = false;
        this.score = 0;
        this.gameSpeed = 3;
        // [테스트용] 재시작 시에도 최고 속도 적용하려면 아래 주석 해제
        // this.gameSpeed = this.MAX_GAME_SPEED;
        this.obstacles = [];
        this.items = [];
        this.obstacleTimer = 0;
        this.itemTimer = 0;

        this.gameOverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden'); // 리더보드 숨김
        this.nameInputModal.classList.add('hidden'); // 이름 입력 모달 숨김
        this.updateScoreUI();

        this.background = new Background(this);
        this.player = new Player(this);

        this.audioManager.playBgm(); // BGM 다시 시작

        this.lastTime = performance.now();
        // 게임 루프는 이미 실행 중이므로 다시 호출하지 않음 (중복 실행 방지)
        // this.gameLoop(this.lastTime);
    }

    /**
     * 게임 시작
     */
    start() {
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.audioManager.playBgm(); // BGM 시작
        // this.gameLoop(this.lastTime); // 생성자에서 이미 루프가 시작되었으므로 호출 제거
    }

    /**
     * 이벤트 리스너 바인딩
     */
    bindEvents() {
        this.restartBtn.addEventListener('click', () => this.restart());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // 리더보드 관련 이벤트
        this.showLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.leaderboardCloseBtn.addEventListener('click', () => {
            this.leaderboardScreen.classList.add('hidden');
            this.gameOverScreen.classList.remove('hidden'); // 게임 오버 화면 다시 표시
        });
        this.submitScoreBtn.addEventListener('click', () => this.submitScore());

        window.addEventListener('keydown', (e) => {
            if (this.isGameOver && e.key.toLowerCase() === 'r') {
                // 모달이나 리더보드가 떠있지 않을 때만 R키로 재시작
                if (this.nameInputModal.classList.contains('hidden') &&
                    this.leaderboardScreen.classList.contains('hidden')) {
                    this.restart();
                }
            }
            // P 키로 일시정지/재개
            if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });

        // Page Visibility API: 탭 전환 시 자동 일시정지
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 탭이 숨겨지면 자동 일시정지 (게임 진행 중일 때만)
                if (this.isGameStarted && !this.isGameOver && !this.isPaused) {
                    this.togglePause();
                }
            }
        });
    }

    /**
     * 메인 게임 루프
     */
    gameLoop(timestamp) {
        // timestamp가 없거나 비정상적인 경우 처리
        if (!timestamp) timestamp = performance.now();

        let deltaTime = timestamp - this.lastTime;

        // deltaTime이 NaN이거나 음수인 경우 보정
        if (isNaN(deltaTime) || deltaTime < 0) {
            deltaTime = 16.67; // 기본 60FPS 기준 값
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

        this.audioManager.stopBgm(); // BGM 정지
        this.audioManager.playGameOverSound(); // 게임 오버 효과음

        // 상위 10위 체크
        const isTopTen = await this.firebaseManager.isTopTen(finalScore);
        if (isTopTen) {
            // 0.5초 뒤에 모달 표시 (게임 오버 인지 후)
            setTimeout(() => {
                this.gameOverScreen.classList.add('hidden');
                this.nameInputModal.classList.remove('hidden');
                this.playerNameInput.focus();
            }, 500);
        } else {
            // 상위 10위가 아니더라도 기록 저장 (이름 없이 'Anonymous'로 저장)
            // 사용자에게는 별도 입력 없이 조용히 저장됨
            this.firebaseManager.saveScore('Anonymous', finalScore);
        }
    }

    /**
     * 점수 제출 처리
     */
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

        // 버튼 비활성화 (중복 제출 방지)
        this.submitScoreBtn.disabled = true;
        this.submitScoreBtn.innerText = "저장 중...";

        const success = await this.firebaseManager.saveScore(name, score);

        if (success) {
            this.nameInputModal.classList.add('hidden');
            this.showLeaderboard(); // 저장 후 바로 리더보드 보여주기
        } else {
            alert("점수 저장에 실패했습니다. 다시 시도해주세요.");
        }

        // 버튼 복구
        this.submitScoreBtn.disabled = false;
        this.submitScoreBtn.innerText = "등록";
        this.playerNameInput.value = ""; // 입력창 초기화
    }

    /**
     * 리더보드 표시
     */
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

            // 날짜 포맷팅 (timestamp가 있으면 변환, 없으면 date 문자열 사용)
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

    /**
     * 일시정지 토글 처리
     */
    togglePause() {
        // 게임 시작 전이거나 게임 오버 상태에서는 일시정지 불가
        if (!this.isGameStarted || this.isGameOver) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.pauseOverlay.classList.remove('hidden');
            this.pauseBtn.innerText = '▶️'; // 재생 아이콘으로 변경
            this.audioManager.pauseBgm();
        } else {
            this.pauseOverlay.classList.add('hidden');
            this.pauseBtn.innerText = '⏸️'; // 일시정지 아이콘으로 복원
            this.pauseBtn.blur(); // 포커스 해제
            this.audioManager.resumeBgm();
            this.lastTime = performance.now(); // deltaTime 보정 (큰 값 방지)
        }
    }

    /**
     * 소리 토글 처리
     */
    toggleMute() {
        const isMuted = this.audioManager.toggleMute();
        this.muteBtn.innerText = isMuted ? '🔇' : '🔊';
        // 포커스 해제 (스페이스바 점프 시 버튼 눌림 방지)
        this.muteBtn.blur();

        // 소리가 켜졌고, 게임이 진행 중이라면(시작 화면이 아니고 게임 오버가 아님) BGM 재생
        if (!isMuted && this.lastTime > 0 && !this.isGameOver) {
            this.audioManager.playBgm();
        }
    }
}
