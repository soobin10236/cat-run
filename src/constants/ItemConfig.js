/**
 * 아이템 관련 설정 및 상수
 * 화면 크기에 따른 반응형 비율 설정을 포함합니다.
 */
export const ITEM_CONFIG = {
    // 아이템 크기 비율 (화면 높이 기준)
    SIZE_RATIO: 0.08, // 약 48px @ 800h

    // 바닥 여백 비율 (ObstacleConfig.GROUND_OFFSET_RATIO와 비슷하거나 약간 다르게)
    GROUND_OFFSET_RATIO: 0.19, // 장애물과 동일하게 설정

    // 생성 규칙
    SPAWN_INTERVAL_MIN: 1000, // 최소 1초
    SPAWN_INTERVAL_MAX: 2000, // 최대 3초
    SPAWN_CHANCE: 0.8,        // 주기마다 생성될 확률 (80%)

    // 안전 거리 (화면 너비 기준 비율)
    SAFE_DISTANCE_RATIO: 0.12, // 장애물/다른 아이템과 최소 12% 거리 유지

    // 위치 및 움직임 관련
    JUMP_HEIGHT_RATIO: 0.15,      // 공중 생성 시 바닥 기준 높이 (점프해서 닿을 높이)
    AIR_SPAWN_CHANCE: 0.5,        // 공중 생성 확률 (50%)
    FLOAT_AMPLITUDE_RATIO: 0.08, // 둥실둥실 움직임 폭 비율 (약 6px @ 800h)
    FLOAT_SPEED: 0.05,             // 둥실둥실 움직임 속도

    // 충돌 박스 크기 비율 (이미지 크기 대비)
    HITBOX_SCALE: 0.8,

    // 아이템 타입 정의
    TYPES: {
        SCORE: 'SCORE',
        SHIELD: 'SHIELD'
    },

    // 아이템 생성 확률 (합이 1.0이 되도록)
    PROBABILITIES: {
        SCORE: 0.9,
        SHIELD: 0.1
    }
};
