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
    const showLeaderboardStartBtn = document.getElementById('show-leaderboard-start-btn');
    const mobileControls = document.getElementById('mobile-controls');

    // 패치 노트 관련 요소
    const patchNotesModal = document.getElementById('patch-notes-modal');
    const closePatchNotesBtn = document.getElementById('close-patch-notes-btn');
    const dontShowAgainCheckbox = document.getElementById('dont-show-again-checkbox');
    const PATCH_VERSION = `v${GAME_VERSION}`; // 현재 패치 버전

    // 패치 노트 확인
    const seenPatchVersion = localStorage.getItem('seenPatchVersion');
    if (seenPatchVersion !== PATCH_VERSION) {
        patchNotesModal.classList.remove('hidden');
    }

    // 패치 노트 닫기
    closePatchNotesBtn.addEventListener('click', () => {
        if (dontShowAgainCheckbox.checked) {
            localStorage.setItem('seenPatchVersion', PATCH_VERSION);
        }
        patchNotesModal.classList.add('hidden');
    });

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

    // 시작 화면에서 랭킹 보기
    showLeaderboardStartBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        gameManager.showLeaderboard();

        // 랭킹 닫기 버튼 동작 수정 (시작 화면으로 돌아오기 위해)
        // GameManager의 기본 동작은 GameOver 화면으로 가는 것이므로, 
        // 여기서 일회성으로 이벤트를 덮어쓰거나 GameManager를 수정해야 함.
        // GameManager.js에서 leaderboardCloseBtn 로직을 수정했으므로 여기서는 별도 처리 불필요할 수도 있으나,
        // GameManager가 'isGameStarted' 상태를 체크해서 분기 처리하도록 수정했음.

        // 다만, GameManager의 leaderboardCloseBtn 이벤트는 이미 바인딩되어 있으므로,
        // 추가적인 처리가 필요할 수 있음. 
        // GameManager.js의 bindEvents에서:
        // this.leaderboardCloseBtn.addEventListener('click', () => {
        //     this.leaderboardScreen.classList.add('hidden');
        //     if (this.isGameOver && !this.isGameStarted) { ... }
        // });
        // 이 로직이 잘 동작하는지 확인 필요. 
        // 시작 화면에서 랭킹을 열었을 때 isGameOver는 false, isGameStarted는 false임.
        // 따라서 아무 화면도 안 뜰 수 있음.

        // 해결책: GameManager에 'onLeaderboardClose' 콜백을 두거나, 
        // 여기서 직접 닫기 버튼에 이벤트를 추가하여 startScreen을 다시 보여줌.

        const returnToStart = () => {
            if (!gameManager.isGameStarted && !gameManager.isGameOver) {
                startScreen.classList.remove('hidden');
            }
            gameManager.leaderboardCloseBtn.removeEventListener('click', returnToStart);
        };
        gameManager.leaderboardCloseBtn.addEventListener('click', returnToStart);
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
