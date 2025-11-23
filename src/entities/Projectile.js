export class Projectile {
    constructor(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.speed = 7; // 총알 속도
        this.markedForDeletion = false;

        // 목표 지점을 향한 벡터 계산
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 단위 벡터(방향) * 속도
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;

        // 꼬리 효과를 위한 이전 위치 저장
        this.history = [];
    }

    update(deltaTime) {
        // 프레임 보정
        const speedFactor = deltaTime / 16.67;

        this.x += this.vx * speedFactor;
        this.y += this.vy * speedFactor;

        // 꼬리 효과 업데이트
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 5) {
            this.history.shift();
        }

        // 화면 밖으로 나가면 제거
        if (this.x < 0 || this.x > this.game.width ||
            this.y < 0 || this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();

        // 꼬리 그리기 (잔상 효과)
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            const alpha = (i + 1) / this.history.length; // 뒤쪽일수록 투명하게
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.radius * (i / this.history.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.5})`;
            ctx.fill();
        }

        // 총알 본체
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000'; // 빨간색
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3333'; // 빛나는 효과
        ctx.fill();

        ctx.restore();
    }
}
