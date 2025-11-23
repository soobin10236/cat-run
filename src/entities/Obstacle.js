/**
 * 장애물 클래스 (Obstacle)
 * 플레이어가 피해야 할 장애물을 생성하고 관리합니다.
 */
import { ASSETS } from '../constants/Assets.js';

export class Obstacle {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = this.game.width; // 화면 오른쪽 끝에서 시작
        this.markedForDeletion = false; // 화면 밖으로 나가면 true

        this.image = new Image();

        // 애니메이션 관련 속성
        this.isAnimated = false; // 애니메이션 사용 여부
        this.frameX = 0; // 현재 프레임 인덱스
        this.maxFrame = 0; // 최대 프레임
        this.fps = 10; // 애니메이션 속도
        this.frameInterval = 1000 / this.fps;
        this.frameTimer = 0;

        // 장애물 타입 결정
        // 70% 확률로 지상 장애물, 30% 확률로 공중 장애물
        const isGround = Math.random() < 0.7;

        if (isGround) {
            // [지상 장애물] - 뒷골목 테마
            this.y = this.game.height - this.height - 50;

            // 30% 확률로 '긴 장애물' (쓰레기통) 생성 (롱 점프 필요)
            if (Math.random() < 0.3) {
                this.width = 100; // 쓰레기통 너비 수정
                this.image.src = ASSETS.IMAGES.OBSTACLE_GROUND_LONG;
            } else {
                this.width = 100; // 일반 너비 수정 (120 -> 100)
                this.image.src = ASSETS.IMAGES.OBSTACLE_GROUND;
            }
        } else {
            // [공중 장애물] - 드론 (스프라이트 애니메이션)
            this.image.src = ASSETS.IMAGES.OBSTACLE_AIR;
            this.isAnimated = true;
            this.maxFrame = 3; // 1x4 스프라이트 (0~3)
            this.width = 80; // 드론 크기 키움 (60 -> 80)
            this.height = 60;

            // 40% 확률로 '낮은 공중 장애물' (숙여야만 지나갈 수 있음)
            if (Math.random() < 0.4) {
                // 플레이어 키(50)보다 약간 낮게 배치 -> 슬라이딩(높이 35) 필요
                // 바닥(50) + 장애물(60) + 여유공간(약간)
                this.y = this.game.height - 50 - 30 - this.height;
            } else {
                // 점프로도 피할 수 있는 높이
                this.y = this.game.height - 50 - 70 - this.height;
            }
        }
    }

    update(deltaTime) {
        // 프레임 레이트 독립적인 속도 보정
        const speedFactor = deltaTime / 16.67;

        // 왼쪽으로 이동
        this.x -= this.game.gameSpeed * speedFactor;

        // 화면 왼쪽으로 완전히 벗어나면 삭제 표시
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }

        // 애니메이션 업데이트
        if (this.isAnimated) {
            if (this.frameTimer > this.frameInterval) {
                this.frameX++;
                if (this.frameX > this.maxFrame) {
                    this.frameX = 0;
                }
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth > 0) {
            if (this.isAnimated) {
                // 스프라이트 시트 그리기 (1x4)
                const spriteWidth = this.image.naturalWidth / (this.maxFrame + 1);
                const spriteHeight = this.image.naturalHeight; // 1줄이므로 전체 높이 사용

                // 여백 제거를 위한 크롭 (Crop) 계산
                // 이미지 중앙의 60%만 사용 (상하좌우 20%씩 잘라냄)
                const cropX = spriteWidth * 0.1;
                const cropY = spriteHeight * 0.2;
                const cropWidth = spriteWidth * 0.8;
                const cropHeight = spriteHeight * 0.6;

                ctx.drawImage(
                    this.image,
                    (this.frameX * spriteWidth) + cropX, cropY, // 소스 x(프레임 이동 + 여백), y(여백)
                    cropWidth, cropHeight,        // 소스 너비, 높이 (잘라낸 크기)
                    this.x, this.y,               // 그릴 x, y
                    this.width, this.height       // 그릴 너비, 높이
                );
            } else {
                // 일반 이미지 그리기 (지상 장애물)
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
        } else {
            // 이미지가 로드되지 않았을 경우 대체 도형 그리기
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // 디버그: 히트박스 그리기 (주석 해제하여 확인 가능)
        // ctx.strokeStyle = 'white';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}
