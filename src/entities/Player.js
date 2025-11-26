/**
 * 플레이어 클래스 (Player)
 * 플레이어 캐릭터(고양이)의 상태, 움직임, 렌더링 및 애니메이션을 담당합니다.
 */
import { ASSETS } from '../constants/Assets.js';
import { PLAYER_CONFIG } from '../constants/PlayerConfig.js';
import { DEBUG_MODE } from '../constants/GameConfig.js';

export class Player {
    constructor(game) {
        this.game = game;

        // 반응형 크기 및 위치 계산
        this.width = this.game.height * PLAYER_CONFIG.SIZE_RATIO;
        this.height = this.width; // 정사각형 비율 유지
        this.originalHeight = this.height;

        this.x = this.game.width * PLAYER_CONFIG.X_POSITION_RATIO;

        // 바닥 위치 계산 (화면 높이 - 플레이어 키 - 바닥 여백)
        this.groundOffset = this.game.height * PLAYER_CONFIG.GROUND_OFFSET_RATIO;
        this.y = this.game.height - this.height - this.groundOffset;

        // 물리 엔진 상수 (화면 높이 비례)
        this.vy = 0;
        this.weight = this.game.height * PLAYER_CONFIG.GRAVITY_RATIO;
        this.jumpPower = this.game.height * PLAYER_CONFIG.JUMP_POWER_RATIO;

        // 스프라이트 이미지 설정
        this.image = new Image();
        this.image.src = ASSETS.IMAGES.PLAYER;

        // 스프라이트 프레임 설정 (이미지 로드 후 계산됨)
        this.spriteWidth = 0;
        this.spriteHeight = 0;
        this.frame = 0; // 현재 프레임 인덱스 (0 ~ 15)

        // 애니메이션 상태 범위
        this.animState = {
            RUN: { min: 0, max: 7 },
            JUMP: { min: 8, max: 11 },
            SLIDE: { min: 12, max: 15 }
        };
        this.currentAnim = this.animState.RUN;

        // 애니메이션 타이밍 제어
        this.fps = 8; // 초당 프레임 수
        this.frameInterval = 1000 / this.fps;
        this.frameTimer = 0;

        // 상태 정의
        this.states = {
            RUN: 0,
            JUMP: 1,
            SLIDE: 2
        };
        this.currentState = this.states.RUN;

        // 무적 상태 (쉴드 아이템)
        this.shieldCount = 0; // 쉴드 개수 (최대 3)
        this.maxShields = 3;
        this.invincibleTimer = 0; // 충돌 후 일시적 무적 타이머
    }

    addShield() {
        if (this.shieldCount < this.maxShields) {
            this.shieldCount++;
        }
    }

    hitShield() {
        if (this.shieldCount > 0) {
            this.shieldCount--;
            this.invincibleTimer = 1000; // 1초간 일시 무적
            return true; // 방어 성공
        }
        return false; // 방어 실패
    }

    update(input, deltaTime) {
        // 프레임 레이트 독립적인 속도 보정
        const speedFactor = deltaTime / 16.67;

        this.checkCollision();

        // 일시 무적 타이머 업데이트
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= deltaTime;
        }

        // 상태 관리 (State Management)
        if (this.currentState === this.states.RUN) {
            this.currentAnim = this.animState.RUN;

            // 점프 시작
            if (input.keys.includes('ArrowUp') || input.keys.includes(' ')) {
                this.vy -= this.jumpPower;
                this.currentState = this.states.JUMP;
                this.game.audioManager.playJumpSound(); // 점프 효과음 재생
                this.frame = this.animState.JUMP.min;
            }
            // 슬라이딩
            else if (input.keys.includes('ArrowDown')) {
                this.currentState = this.states.SLIDE;
                this.frame = this.animState.SLIDE.min;
            }
        } else if (this.currentState === this.states.JUMP) {
            this.currentAnim = this.animState.JUMP;

            // 가변 점프
            if (!input.keys.includes('ArrowUp') && !input.keys.includes(' ') && this.vy < 0) {
                this.vy *= 0.5;
            }

            // 점프 애니메이션: 속도에 따라 프레임 매핑 (자연스러운 체공 표현)
            if (this.vy < -this.jumpPower / 2) {
                this.frame = 8; // 상승 초기 (Launch)
            } else if (this.vy < 0) {
                this.frame = 9; // 상승 후기 (Air)
            } else if (this.vy > 0 && this.vy < this.jumpPower / 2) {
                this.frame = 10; // 하강 초기 (Peak/Down)
            } else if (this.vy > this.jumpPower / 2) {
                this.frame = 11; // 하강 후기 (Land)
            }

            // 바닥에 닿으면 런 상태로 복귀
            if (this.onGround()) {
                this.currentState = this.states.RUN;
                this.frame = this.animState.RUN.min;
            }
        } else if (this.currentState === this.states.SLIDE) {
            this.currentAnim = this.animState.SLIDE;

            if (!input.keys.includes('ArrowDown')) {
                this.currentState = this.states.RUN;
                this.frame = this.animState.RUN.min;
            }
        }

        // 물리 엔진 (수직 이동)
        this.y += this.vy * speedFactor;

        // 점프 시 약간 앞으로 이동 (원래 위치 + 여유분)
        if (this.currentState === this.states.JUMP) {
            const jumpForwardLimit = this.game.width * PLAYER_CONFIG.X_POSITION_RATIO + 50;
            if (this.x < jumpForwardLimit) {
                this.x += 0.5 * speedFactor;
            }
        } else {
            const originalX = this.game.width * PLAYER_CONFIG.X_POSITION_RATIO;
            if (this.x > originalX) { // 원래 위치로 복귀
                this.x -= 2 * speedFactor;
            }
        }

        if (!this.onGround()) {
            this.vy += this.weight * speedFactor;
        } else {
            this.vy = 0;
            if (this.currentState !== this.states.JUMP) {
                this.y = this.game.height - this.height - this.groundOffset;
            }
        }

        // 슬라이딩 시 히트박스 조정
        if (this.currentState === this.states.SLIDE) {
            this.height = this.width * 0.7; // 높이 70%로 조정
            this.y = this.game.height - this.height - this.groundOffset;
        } else {
            this.height = this.width; // 원래 높이 복구 (정사각형)
        }

        // 애니메이션 프레임 업데이트 (점프 상태가 아닐 때만 타이머 기반)
        if (this.currentState !== this.states.JUMP) {
            if (this.frameTimer > this.frameInterval) {
                this.frame++;
                if (this.frame > this.currentAnim.max) {
                    this.frame = this.currentAnim.min;
                }
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
        }
    }

    draw(ctx) {
        // 일시 무적 상태일 때 깜빡임 효과
        if (this.invincibleTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return; // 그리지 않음 (깜빡임)
        }

        if (this.image.complete && this.image.naturalWidth > 0) {
            // 이미지 크기에 맞춰 스프라이트 프레임 크기 동적 계산 (4x4 그리드)
            this.spriteWidth = this.image.naturalWidth / 4;
            this.spriteHeight = this.image.naturalHeight / 4;

            // 4x4 그리드 계산
            const col = this.frame % 4;
            const row = Math.floor(this.frame / 4);

            // 스프라이트 그리기 위치 보정
            const drawY = this.y + (this.height - this.originalHeight);

            ctx.drawImage(
                this.image,
                col * this.spriteWidth,
                row * this.spriteHeight,
                this.spriteWidth,
                this.spriteHeight,
                this.x,
                drawY,
                this.width,
                this.originalHeight // 원래 크기로 그리기 (찌그러짐 방지)
            );
        } else {
            // 대체 도형
            ctx.fillStyle = 'orange';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // 쉴드 상태 시각 효과 (개수에 따라 다르게)
        if (this.shieldCount > 0) {
            // 두께를 얇게 조정 (2, 3, 4)
            ctx.lineWidth = 2 + (this.shieldCount - 1) * 1;

            if (this.shieldCount === 1) ctx.strokeStyle = '#00FFFF'; // 시안 (1개)
            else if (this.shieldCount === 2) ctx.strokeStyle = '#0088FF'; // 파랑 (2개)
            else ctx.strokeStyle = '#8800FF'; // 보라 (3개)

            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 디버그: 히트박스 그리기
        if (DEBUG_MODE) {
            ctx.strokeStyle = '#00FF00'; // 초록색 (플레이어)
            ctx.lineWidth = 2;

            // GameManager의 충돌 로직과 동일한 계산 (50% 크기)
            const hitWidth = this.width * 0.5;
            const hitHeight = this.height * 0.5;
            const hitX = this.x + (this.width - hitWidth) / 2;
            const hitY = this.y + (this.height - hitHeight) / 2;

            ctx.strokeRect(hitX, hitY, hitWidth, hitHeight);
        }
    }

    /**
     * 플레이어가 바닥에 있는지 확인
     */
    onGround() {
        return this.y >= this.game.height - this.height - this.groundOffset;
    }

    checkCollision() {
        if (this.y > this.game.height - this.height - this.groundOffset) {
            this.y = this.game.height - this.height - this.groundOffset;
        }
    }
}
