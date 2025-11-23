/**
 * 플레이어 클래스 (Player)
 * 플레이어 캐릭터(고양이)의 상태, 움직임, 렌더링 및 애니메이션을 담당합니다.
 */
const GROUND_OFFSET = 45; // 바닥 높이 보정값 (변경이 쉽도록 상수로 관리)

import { ASSETS } from '../constants/Assets.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.width = 80; // 화면에 표시될 너비 (50 -> 80으로 증가)
        this.height = 80; // 화면에 표시될 높이
        this.originalHeight = 80; // 그리기용 원래 높이 (찌그러짐 방지)
        this.x = 200; // 화면 왼쪽에서 25% 위치 (800px 기준)
        this.y = this.game.height - this.height - GROUND_OFFSET; // 초기 바닥 위치

        this.vy = 0; // 수직 속도
        this.weight = 0.5; // 중력
        this.jumpPower = 12; // 점프 힘 (15 -> 12로 감소)

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
    }

    update(input, deltaTime) {
        this.checkCollision();

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
        this.y += this.vy;

        // 점프 시 약간 앞으로 이동 (25% 위치 기준)
        if (this.currentState === this.states.JUMP) {
            if (this.x < 250) { // 200 + 50
                this.x += 0.5;
            }
        } else {
            if (this.x > 200) { // 원래 위치로 복귀
                this.x -= 2;
            }
        }

        if (!this.onGround()) {
            this.vy += this.weight;
        } else {
            this.vy = 0;
            if (this.currentState !== this.states.JUMP) {
                this.y = this.game.height - this.height - GROUND_OFFSET;
            }
        }

        // 슬라이딩 시 히트박스 조정
        if (this.currentState === this.states.SLIDE) {
            this.height = 56; // 높이 70%로 조정 (80 * 0.7 = 56)
            this.y = this.game.height - this.height - GROUND_OFFSET;
        } else {
            this.height = 80; // 원래 높이 복구
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
        // 디버깅용 로그 (1초에 한 번 정도만 출력)
        // if (this.game.score % 1 < 0.02) {
        //     console.log('Player Draw Debug:', {
        //         complete: this.image.complete,
        //         naturalWidth: this.image.naturalWidth,
        //         naturalHeight: this.image.naturalHeight,
        //         x: this.x,
        //         y: this.y,
        //         frame: this.frame,
        //         spriteWidth: this.spriteWidth,
        //         spriteHeight: this.spriteHeight
        //     });
        // }

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

        // 디버그: 히트박스
        // ctx.strokeStyle = 'black';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    /**
     * 플레이어가 바닥에 있는지 확인
     */
    onGround() {
        return this.y >= this.game.height - this.height - GROUND_OFFSET;
    }

    checkCollision() {
        if (this.y > this.game.height - this.height - GROUND_OFFSET) {
            this.y = this.game.height - this.height - GROUND_OFFSET;
        }
    }
}
