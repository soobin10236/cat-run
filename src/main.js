/**
 * 메인 진입점 (Entry Point)
 * 게임의 초기화를 담당합니다.
 */
import { GameManager } from './GameManager.js';

// DOM 컨텐츠가 모두 로드된 후 실행
window.addEventListener('DOMContentLoaded', () => {
    // 캔버스 엘리먼트 가져오기
    const canvas = document.getElementById('game-canvas');

    // 게임 매니저 인스턴스 생성 (게임 로직 총괄)
    const gameManager = new GameManager(canvas);

    // 시작 화면 요소 가져오기
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const mobileControls = document.getElementById('mobile-controls');

    // 게임 시작 전에는 모바일 컨트롤 숨김
    if (mobileControls) {
        mobileControls.style.display = 'none';
    }

    // 시작 버튼 클릭 시 게임 시작
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden'); // 시작 화면 숨김

        // 모바일 컨트롤 표시 (모바일인 경우에만)
        if (mobileControls && window.innerWidth <= 768) {
            mobileControls.style.display = 'flex';
        }

        gameManager.start(); // 게임 시작 (BGM 재생 포함)
    });
});
