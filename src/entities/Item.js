/**
 * 아이템 클래스 (Item)
 * 플레이어가 획득할 수 있는 아이템(점수 등)을 관리합니다.
 */
import { ASSETS } from '../constants/Assets.js';
import { ITEM_CONFIG } from '../constants/ItemConfig.js';
import { DEBUG_MODE } from '../constants/GameConfig.js';

export class Item {
    constructor(game, type = ITEM_CONFIG.TYPES.SCORE) {
        this.game = game;
        this.type = type;

        // 반응형 크기 계산
        this.width = this.game.height * ITEM_CONFIG.SIZE_RATIO;
        this.height = this.width; // 정사각형

        this.x = this.game.width;
        this.markedForDeletion = false;

        // 타입별 이미지 및 효과 설정
        this.image = new Image();
        if (this.type === ITEM_CONFIG.TYPES.SCORE) {
            this.image.src = ASSETS.IMAGES.ITEM_SCORE;
        } else if (this.type === ITEM_CONFIG.TYPES.SHIELD) {
            this.image.src = ASSETS.IMAGES.ITEM_SHIELD;
        }

        // 높이 설정
        const groundOffset = this.game.height * ITEM_CONFIG.GROUND_OFFSET_RATIO;
        const jumpHeight = this.game.height * ITEM_CONFIG.JUMP_HEIGHT_RATIO;

        // 둥실둥실 진폭 미리 계산
        this.floatAmplitude = this.game.height * ITEM_CONFIG.FLOAT_AMPLITUDE_RATIO;

        // 확률적으로 바닥 근처 또는 공중 생성
        if (Math.random() < (1 - ITEM_CONFIG.AIR_SPAWN_CHANCE)) {
            // 바닥 생성: 둥실둥실하다가 바닥 뚫지 않도록 진폭만큼 위로 올림
            this.y = this.game.height - this.height - groundOffset - this.floatAmplitude;
        } else {
            this.y = this.game.height - this.height - groundOffset - jumpHeight; // 공중
        }

        // 사인파 움직임을 위한 속성
        this.angle = 0;
        this.initialY = this.y;
    }

    update(deltaTime) {
        const speedFactor = deltaTime / 16.67;

        // 이동
        this.x -= this.game.gameSpeed * speedFactor;

        // 둥실둥실 효과
        this.angle += ITEM_CONFIG.FLOAT_SPEED * speedFactor;
        // this.floatAmplitude는 생성자에서 계산됨
        this.y = this.initialY + Math.sin(this.angle) * this.floatAmplitude;

        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 이미지가 없으면 타입별 색상으로 대체
            if (this.type === ITEM_CONFIG.TYPES.SHIELD) {
                ctx.fillStyle = 'cyan';
            } else {
                ctx.fillStyle = 'yellow';
            }
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 디버그: 히트박스 그리기
        if (DEBUG_MODE) {
            ctx.strokeStyle = '#FFFF00'; // 노란색 (아이템)
            ctx.lineWidth = 2;

            // GameManager 충돌 로직과 동일한 스케일
            const scale = ITEM_CONFIG.HITBOX_SCALE;
            const hitWidth = this.width * scale;
            const hitHeight = this.height * scale;
            const hitX = this.x + (this.width - hitWidth) / 2;
            const hitY = this.y + (this.height - hitHeight) / 2;

            ctx.strokeRect(hitX, hitY, hitWidth, hitHeight);
        }
    }
}
