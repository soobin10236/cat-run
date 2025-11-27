/**
 * 플레이어 관련 설정 및 상수
 * 화면 크기에 따른 반응형 비율 설정을 포함합니다.
 */
export const PLAYER_CONFIG = {
    // 화면 높이 대비 크기 비율 (예: 0.15 = 화면 높이의 15%)
    // PC(1080px) 기준 약 162px, 모바일(800px) 기준 약 120px
    SIZE_RATIO: 0.14,

    // 화면 너비 대비 X 위치 비율 (왼쪽에서 얼마나 떨어져 있는지)
    X_POSITION_RATIO: 0.1,

    // 화면 높이 대비 바닥 여백 비율
    GROUND_OFFSET_RATIO: 0.16,

    // 물리 엔진 관련 (화면 높이 기준 비율)
    JUMP_POWER_RATIO: 0.020, // 점프 힘
    GRAVITY_RATIO: 0.0008    // 중력
};
