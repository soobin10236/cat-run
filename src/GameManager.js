import { InputHandler } from './utils/InputHandler.js';
import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Item } from './entities/Item.js';
import { Background } from './entities/Background.js';
import { AudioManager } from './utils/AudioManager.js';

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

        // 게임 속도 설정
        this.MAX_GAME_SPEED = 4.5; // 최대 게임 속도 제한 (눈의 피로 방지)
        this.gameSpeed = 3; // 초기 게임 속도

        // [테스트용] 시작부터 최고 속도로 설정하려면 아래 주석을 해제하세요.
        // this.gameSpeed = this.MAX_GAME_SPEED;

        this.audioManager = new AudioManager(); // 오디오 매니저 인스턴스
        this.input = new InputHandler(); // 입력 처리기
        this.background = new Background(this); // 배경
        this.player = new Player(this); // 플레이어

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

            // 다음 장애물 생성 간격 계산 (더 촘촘하게)
            // 1. 속도에 따른 감소 (계수 350으로 증가)
            const speedReduction = this.gameSpeed * 350;

            // 2. 점수에 따른 추가 감소
            const scoreReduction = this.score * 0.1;

            // 기본값을 2200으로 낮춰서 전체적으로 더 자주 나오게 함
            const baseInterval = 2200 - speedReduction - scoreReduction;

            // 최소 간격 300ms 수정
            const safeInterval = Math.max(baseInterval, 300);

            // 랜덤성도 줄여서(300ms) 더 규칙적으로 빡빡하게
            this.obstacleInterval = safeInterval + Math.random() * 300;
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
        if (this.itemTimer > this.itemInterval) {
            // 30% 확률로 아이템 생성
            if (Math.random() < 0.3) {
                this.items.push(new Item(this));
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
        window.addEventListener('keydown', (e) => {
            if (this.isGameOver && e.key.toLowerCase() === 'r') {
                this.restart();
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
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateScoreUI() {
        this.scoreElement.innerText = Math.floor(this.score);
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverScreen.classList.remove('hidden');
        this.finalScoreElement.innerText = Math.floor(this.score);

        this.audioManager.stopBgm(); // BGM 정지
        this.audioManager.playGameOverSound(); // 게임 오버 효과음
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
