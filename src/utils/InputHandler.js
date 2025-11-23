/**
 * 입력 처리기 (InputHandler)
 * 키보드 입력을 감지하고 현재 눌린 키들의 상태를 관리합니다.
 */
export class InputHandler {
    constructor() {
        // 현재 눌려있는 키들을 저장하는 배열
        this.keys = [];

        // 키를 눌렀을 때 이벤트 리스너
        window.addEventListener('keydown', e => {
            // 게임에 사용되는 키들만 추적 (화살표 키, 스페이스바)
            if ((e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === ' ' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight')
                && this.keys.indexOf(e.key) === -1) { // 이미 눌려있지 않은 경우에만 추가
                this.keys.push(e.key);
            }
        });

        // 키를 뗐을 때 이벤트 리스너
        window.addEventListener('keyup', e => {
            // 해당 키가 배열에 있다면 제거
            if (e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === ' ' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight') {
                this.keys.splice(this.keys.indexOf(e.key), 1);
            }
        });
    }
}
