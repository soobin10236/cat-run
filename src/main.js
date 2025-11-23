/**
 * 메인 진입점 (Entry Point)
 * 게임의 초기화를 담당합니다.
 */
import { GameManager } from './GameManager.js';
import { ASSETS } from './constants/Assets.js';
import { GAME_VERSION } from './constants/Version.js';

// DOM 컨텐츠가 모두 로드된 후 실행
window.addEventListener('DOMContentLoaded', async () => {
    // 버전 정보 표시
    const versionElement = document.getElementById('game-version');
    if (versionElement) {
        versionElement.innerText = GAME_VERSION;
    }

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

    // 1. 이미지 프리로딩 시작
    startBtn.disabled = true;
    startBtn.innerText = "Loading...";
    startBtn.style.backgroundColor = "#95a5a6"; // 회색으로 변경
    startBtn.style.cursor = "wait";

    try {
        await preloadImages();
        // 로딩 완료
        startBtn.disabled = false;
        startBtn.innerText = "Start Game";
        startBtn.style.backgroundColor = ""; // 원래 색으로 복구
        startBtn.style.cursor = "pointer";
    } catch (error) {
        console.error("이미지 로딩 실패:", error);
        startBtn.innerText = "Error Loading Assets";
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

/**
 * 모든 이미지 리소스를 미리 로드합니다.
 */
function preloadImages() {
    const promises = Object.values(ASSETS.IMAGES).map(src => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    });

    return Promise.all(promises);
}
