/**
 * 장애물 클래스 (Obstacle)
 * 플레이어가 피해야 할 장애물을 생성하고 관리합니다.
 */
import { ASSETS } from '../constants/Assets.js';
import { Projectile } from './Projectile.js';
import { DIFFICULTY_SETTINGS, DEBUG_MODE } from '../constants/GameConfig.js';
import { OBSTACLE_CONFIG } from '../constants/ObstacleConfig.js';

export class Obstacle {
    constructor(game) {
        this.game = game;

        // 기본 크기 계산 (나중에 타입에 따라 덮어씌워짐)
        this.width = this.game.height * OBSTACLE_CONFIG.GROUND.WIDTH_RATIO;
        this.height = this.game.height * OBSTACLE_CONFIG.GROUND.HEIGHT_RATIO;

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

        // 총알 발사 여부 (드론 전용)
        this.hasFired = false;

        // 공통 바닥 여백 계산
        const groundOffset = this.game.height * OBSTACLE_CONFIG.GROUND_OFFSET_RATIO;

        // 장애물 타입 결정
        const { PROBABILITY } = DIFFICULTY_SETTINGS.OBSTACLE;

        // 지상 장애물 확률
        const isGround = Math.random() < PROBABILITY.GROUND;

        if (isGround) {
            // [지상 장애물]
            this.y = this.game.height - this.height - groundOffset;

            // '긴 장애물' (쓰레기통) 생성
            if (Math.random() < PROBABILITY.GROUND_LONG) {
                this.width = this.game.height * OBSTACLE_CONFIG.GROUND.LONG_WIDTH_RATIO;
                this.image.src = ASSETS.IMAGES.OBSTACLE_GROUND_LONG;
            } else {
                this.image.src = ASSETS.IMAGES.OBSTACLE_GROUND;
            }
        } else {
            // [공중 장애물] - 드론
            this.image.src = ASSETS.IMAGES.OBSTACLE_AIR;
            this.isAnimated = true;
            this.maxFrame = 3;

            this.width = this.game.height * OBSTACLE_CONFIG.AIR.WIDTH_RATIO;
            this.height = this.game.height * OBSTACLE_CONFIG.AIR.HEIGHT_RATIO;

            // '낮은 공중 장애물'
            if (Math.random() < PROBABILITY.AIR_LOW) {
                // 바닥 + 장애물 + 낮은 갭
                const gap = this.game.height * OBSTACLE_CONFIG.AIR.LOW_GAP_RATIO;
                this.y = this.game.height - groundOffset - gap - this.height;
            } else {
                // 바닥 + 장애물 + 높은 갭
                const gap = this.game.height * OBSTACLE_CONFIG.AIR.HIGH_GAP_RATIO;
                this.y = this.game.height - groundOffset - gap - this.height;
            }
            this.initialY = this.y; // 기준 높이 저장
            this.angle = Math.random() * Math.PI * 2; // 랜덤 시작 위상
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

            const { THRESHOLDS } = DIFFICULTY_SETTINGS.OBSTACLE;

            // [NEW] 드론 상하 움직임 (점수 기준)
            if (this.game.score >= THRESHOLDS.DRONE_MOVE_LEVEL_1 && this.game.score < THRESHOLDS.DRONE_MOVE_LEVEL_2) {
                this.angle += 0.02 * speedFactor;
                const amplitude = this.game.height * OBSTACLE_CONFIG.DRONE_AMPLITUDE.LEVEL_1_RATIO;
                this.y = this.initialY + Math.sin(this.angle) * amplitude;
            } else if (this.game.score >= THRESHOLDS.DRONE_MOVE_LEVEL_2) {
                this.angle += 0.04 * speedFactor;
                const amplitude = this.game.height * OBSTACLE_CONFIG.DRONE_AMPLITUDE.LEVEL_2_RATIO;
                this.y = this.initialY + Math.sin(this.angle) * amplitude;
            }

            // [NEW] 드론 공격 로직
            if (this.game.score >= THRESHOLDS.DRONE_ATTACK && !this.hasFired) {
                // 화면에 완전히 들어왔을 때 (오른쪽 끝에서 100px 안쪽)
                // 그리고 플레이어보다 오른쪽에 있을 때
                if (this.x < this.game.width - 100 && this.x > this.game.player.x) {
                    // 플레이어 중앙을 조준
                    const targetX = this.game.player.x + this.game.player.width / 2;
                    const targetY = this.game.player.y + this.game.player.height / 2;

                    // 총알 발사 (드론 중앙에서)
                    const projectileX = this.x + this.width / 2;
                    const projectileY = this.y + this.height / 2;

                    this.game.projectiles.push(
                        new Projectile(this.game, projectileX, projectileY, targetX, targetY)
                    );

                    this.hasFired = true;
                }
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

        // 디버그: 히트박스 그리기
        if (DEBUG_MODE) {
            ctx.strokeStyle = '#FF0000'; // 빨간색 (장애물)
            ctx.lineWidth = 2;

            let scaleX, scaleY;

            // GameManager의 충돌 로직과 동일한 스케일 적용
            if (this.isAnimated) {
                scaleX = 0.6; // 기본값
                scaleY = 0.4; // 드론은 납작하게
            } else {
                scaleX = 0.7; // 지상 장애물은 약간 좁게
                scaleY = 0.6; // 높이도 약간 낮게
            }

            const hitWidth = this.width * scaleX;
            const hitHeight = this.height * scaleY;
            const hitX = this.x + (this.width - hitWidth) / 2;
            const hitY = this.y + (this.height - hitHeight) / 2;

            ctx.strokeRect(hitX, hitY, hitWidth, hitHeight);
        }
    }
}
