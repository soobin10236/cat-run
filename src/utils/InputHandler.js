/**
 * 입력 처리기 (InputHandler)
 * 키보드 입력과 터치 입력을 감지하고 현재 눌린 키들의 상태를 관리합니다.
 */
export class InputHandler {
    constructor() {
        // 현재 눌려있는 키들을 저장하는 배열
        this.keys = [];

        // 키보드 이벤트 - 키를 눌렀을 때
        window.addEventListener('keydown', e => {
            if ((e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === ' ' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight')
                && this.keys.indexOf(e.key) === -1) {
                this.keys.push(e.key);
            }
        });

        // 키보드 이벤트 - 키를 뗐을 때
        window.addEventListener('keyup', e => {
            if (e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === ' ' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight') {
                this.keys.splice(this.keys.indexOf(e.key), 1);
            }
        });

        // 모바일 터치 컨트롤 - 점프 버튼
        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            // 터치 시작
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.keys.indexOf('ArrowUp') === -1) {
                    this.keys.push('ArrowUp');
                }
            });

            // 터치 종료
            jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const index = this.keys.indexOf('ArrowUp');
                if (index !== -1) {
                    this.keys.splice(index, 1);
                }
            });

            // 마우스 클릭 (PC에서도 작동)
            jumpBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (this.keys.indexOf('ArrowUp') === -1) {
                    this.keys.push('ArrowUp');
                }
            });

            jumpBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                const index = this.keys.indexOf('ArrowUp');
                if (index !== -1) {
                    this.keys.splice(index, 1);
                }
            });
        }

        // 모바일 터치 컨트롤 - 슬라이드 버튼
        const slideBtn = document.getElementById('slide-btn');
        if (slideBtn) {
            // 터치 시작
            slideBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.keys.indexOf('ArrowDown') === -1) {
                    this.keys.push('ArrowDown');
                }
            });

            // 터치 종료
            slideBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const index = this.keys.indexOf('ArrowDown');
                if (index !== -1) {
                    this.keys.splice(index, 1);
                }
            });

            // 마우스 클릭 (PC에서도 작동)
            slideBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (this.keys.indexOf('ArrowDown') === -1) {
                    this.keys.push('ArrowDown');
                }
            });

            slideBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                const index = this.keys.indexOf('ArrowDown');
                if (index !== -1) {
                    this.keys.splice(index, 1);
                }
            });
        }
    }
}
