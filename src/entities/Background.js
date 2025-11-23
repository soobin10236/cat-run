/**
 * 배경 관리 클래스 (Background)
 * 구름 등을 생성하고 움직여서 패럴랙스 효과나 배경 흐름을 만듭니다.
 */
import { ASSETS } from '../constants/Assets.js';

export class Background {
    constructor(game) {
        this.game = game;
        this.image = new Image();
        this.image.src = ASSETS.IMAGES.BACKGROUND;

        // 무한 스크롤을 위해 이미지 2개를 이어 붙임
        this.x1 = 0;
        this.x2 = this.game.width;
    }

    update(deltaTime) {
        // 게임 속도에 맞춰 배경 이동 (바닥이 포함되어 있으므로 동일 속도)
        this.x1 -= this.game.gameSpeed;
        this.x2 -= this.game.gameSpeed;

        // 첫 번째 이미지가 화면 왼쪽으로 완전히 사라지면 두 번째 이미지 뒤로 이동
        if (this.x1 <= -this.game.width) {
            this.x1 = this.x2 + this.game.width;
        }

        // 두 번째 이미지가 화면 왼쪽으로 완전히 사라지면 첫 번째 이미지 뒤로 이동
        if (this.x2 <= -this.game.width) {
            this.x2 = this.x1 + this.game.width;
        }
    }

    draw(ctx) {
        if (this.image.complete) {
            // 이미지 2장을 연속해서 그림
            // 화면 크기에 꽉 차게 그림 (stretch)
            // 틈새(흰색 실선) 방지를 위해 너비를 1px 더 크게 그림 (오버랩)
            const drawWidth = this.game.width + 1;
            ctx.drawImage(this.image, Math.floor(this.x1), 0, drawWidth, this.game.height);
            ctx.drawImage(this.image, Math.floor(this.x2), 0, drawWidth, this.game.height);
        } else {
            // 이미지가 없을 때를 대비한 기본 배경색 (하늘색)
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, this.game.width, this.game.height);
        }
    }
}
