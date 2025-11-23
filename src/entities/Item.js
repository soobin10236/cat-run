/**
 * 아이템 클래스 (Item)
 * 플레이어가 획득할 수 있는 아이템(츄르 등)을 관리합니다.
 */
import { ASSETS } from '../constants/Assets.js';

export class Item {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = this.game.width; // 화면 오른쪽 끝에서 시작
        this.markedForDeletion = false; // 화면 밖으로 나가거나 획득되면 true

        this.image = new Image();
        this.image.src = ASSETS.IMAGES.ITEM;

        // 랜덤 높이 설정 (바닥보다는 높고, 너무 높지 않게)
        const minHeight = this.game.height - 50 - 150;
        const maxHeight = this.game.height - 50 - 50;
        this.y = Math.random() * (maxHeight - minHeight) + minHeight;
    }

    update(deltaTime) {
        // 왼쪽으로 이동
        this.x -= this.game.gameSpeed;

        // 화면 왼쪽으로 완전히 벗어나면 삭제 표시
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 이미지가 로드되지 않았을 경우 대체 도형 그리기
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 디버그: 히트박스 그리기
        // ctx.strokeStyle = 'white';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}
