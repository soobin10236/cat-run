/**
 * 오디오 관리자 (AudioManager)
 * BGM 재생 및 Web Audio API를 이용한 효과음 합성을 담당합니다.
 */
import { ASSETS } from '../constants/Assets.js';

export class AudioManager {
    constructor() {
        // Web Audio API 컨텍스트 생성 (효과음용)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // BGM 오디오 객체 생성
        // 주의: 실제 파일이 없으면 에러가 날 수 있으므로 try-catch 처리하거나 파일 존재 확인 필요
        this.bgmAudio = new Audio(ASSETS.AUDIO.BGM);
        this.bgmAudio.loop = true; // 무한 반복
        this.bgmAudio.volume = 0.3; // 배경음은 약간 작게

        // 점프 효과음 (meow.mp3)
        this.jumpAudio = new Audio(ASSETS.AUDIO.JUMP);
        this.jumpAudio.volume = 0.2; // 점프 소리 줄임 (0.5 -> 0.2)

        this.isMuted = false; // 소리 켜짐/꺼짐 상태
    }

    /**
     * 소리 켜기/끄기 토글
     * @returns {boolean} 현재 음소거 상태 (true: 음소거, false: 소리 켜짐)
     */
    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            this.bgmAudio.pause();
        }

        return this.isMuted;
    }

    /**
     * 배경음악 재생
     * 브라우저 정책상 사용자 인터랙션(클릭 등) 이후에 호출되어야 함
     */
    playBgm() {
        if (this.isMuted) return;

        this.bgmAudio.play().catch(e => {
            console.log("BGM 재생 실패 (파일이 없거나 사용자 인터랙션 필요):", e);
        });
    }

    /**
     * 배경음악 정지
     */
    stopBgm() {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
    }

    /**
     * 배경음악 일시정지
     */
    pauseBgm() {
        this.bgmAudio.pause();
    }

    /**
     * 배경음악 재개
     */
    resumeBgm() {
        if (!this.isMuted) {
            this.bgmAudio.play().catch(e => {
                console.log("BGM 재생 실패:", e);
            });
        }
    }

    /**
     * 점프 효과음 재생
     * meow.mp3 파일을 사용하여 고양이 소리를 냅니다.
     */
    playJumpSound() {
        if (this.isMuted) return;

        // 재생 위치를 처음으로 돌려서 연속 점프 시에도 소리가 바로 나오게 함
        this.jumpAudio.currentTime = 0;
        this.jumpAudio.play().catch(e => {
            console.log("점프 소리(meow.mp3) 재생 실패:", e);
        });
    }

    /**
     * 게임 오버 효과음 (띠로리~)
     * 주파수를 계단식으로 내려서 구현
     */
    playGameOverSound() {
        if (this.isMuted) return;

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'triangle'; // 약간 날카로운 소리

        const now = this.audioCtx.currentTime;

        // 멜로디: 미 -> 도 -> 라 (빠르게)
        osc.frequency.setValueAtTime(659.25, now); // 미 (E5)
        osc.frequency.setValueAtTime(523.25, now + 0.1); // 도 (C5)
        osc.frequency.setValueAtTime(440.00, now + 0.2); // 라 (A4)

        // 볼륨: 유지하다가 마지막에 페이드 아웃
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.setValueAtTime(0.3, now + 0.2);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.6);
    }

    /**
     * 아이템 획득 효과음 (띵!)
     */
    playItemSound() {
        if (this.isMuted) return;

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';

        const now = this.audioCtx.currentTime;

        // 높은 음 (1200Hz)
        osc.frequency.setValueAtTime(1200, now);

        // 짧고 경쾌하게
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }
}
