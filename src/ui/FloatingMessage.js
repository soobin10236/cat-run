/**
 * 플로팅 메시지 클래스 (FloatingMessage)
 * 점수 획득이나 아이템 효과 발동 시 화면에 떠오르는 텍스트 효과를 관리합니다.
 */
export class FloatingMessage {
    constructor(text, x, y, targetX, targetY, color = 'white') {
        this.text = text;
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;

        this.markedForDeletion = false;
        this.timer = 0;
        this.maxTime = 1000; // 1초 동안 표시

        // 위로 올라가는 속도
        this.vy = -1;
        this.alpha = 1; // 투명도
    }

    update(deltaTime) {
        this.x += (this.targetX - this.x) * 0.03;
        this.y += (this.targetY - this.y) * 0.03;

        this.y += this.vy; // 위로 천천히 이동
        this.timer += deltaTime;

        // 시간이 지날수록 투명해짐 (마지막 30% 구간에서 페이드 아웃)
        if (this.timer > this.maxTime * 0.7) {
            this.alpha -= 0.05;
        }

        if (this.timer > this.maxTime || this.alpha <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px monospace';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
