/**
 * 장애물 관련 설정 및 상수
 * 화면 크기에 따른 반응형 비율 설정을 포함합니다.
 */
export const OBSTACLE_CONFIG = {
    GROUND: {
        WIDTH_RATIO: 0.15,      // 기본 너비 비율 
        HEIGHT_RATIO: 0.15,     // 기본 높이 비율
        LONG_WIDTH_RATIO: 0.3  // 긴 장애물 너비 비율 
    },
    AIR: {
        WIDTH_RATIO: 0.2,      // 드론 너비 비율 (약 80px)
        HEIGHT_RATIO: 0.2,     // 드론 높이 비율 (약 60px)

        // 바닥(Ground Offset) 위로 얼마나 떠 있는지
        LOW_GAP_RATIO: 0.03,    // 낮은 장애물 (슬라이딩 필요)
        HIGH_GAP_RATIO: 0.09    // 높은 장애물 (점프 가능)
    },
    // 바닥 여백 비율 (시각적 보정을 위해 플레이어보다 약간 높게 설정)
    GROUND_OFFSET_RATIO: 0.18,

    // 드론 상하 움직임 폭 비율
    DRONE_AMPLITUDE: {
        LEVEL_1_RATIO: 0.04, // 약 20px
        LEVEL_2_RATIO: 0.06  // 약 30px
    }
};
