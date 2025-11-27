/**
 * 게임 난이도 및 밸런스 설정
 * 목표: 평균 게임 시간 60초(테스트중인 수치)
 * MAX 속도 도달 시점 시점에 MAX_SPEED에 도달하고, 장애물 간격이 최소화되도록 설계
 */
export const DIFFICULTY_SETTINGS = {
    GAME_SPEED: {
        INITIAL: 4.0,
        MAX: 8.0, // MAX 속도 도달 시점의 목표 속도
        TARGET_TIME_SECONDS: 90, // MAX 속도 도달 시간
    },
    OBSTACLE: {
        BASE_INTERVAL: 2300, // 기본 생성 간격 (ms)
        MIN_INTERVAL: 700,   // 최소 생성 간격 (ms) - 0.5초 마지노선 확보용
        SPEED_COEFFICIENT: 200, // 속도 1 증가당 간격 감소량 (ms)
        SCORE_COEFFICIENT: 0.05, // 점수 1점당 간격 감소량 (ms)
        RANDOM_DELAY: 700,    // 추가 랜덤 지연 시간 (ms)

        // 장애물 생성 확률 및 패턴
        PROBABILITY: {
            GROUND: 0.7, // 지상 장애물 확률 (나머지는 공중)
            GROUND_LONG: 0.3, // 지상 장애물 중 긴 장애물(쓰레기통) 확률
            AIR_LOW: 0.4 // 공중 장애물 중 낮은 장애물 확률
        },

        // 점수에 따른 난이도 변화 (드론 행동)
        THRESHOLDS: {
            DRONE_MOVE_LEVEL_1: 5000,
            DRONE_MOVE_LEVEL_2: 10000,
            DRONE_ATTACK: 50000
        }
    }
};

export const DEBUG_MODE = false; // 디버그 모드 활성화 여부

// 초당 속도 증가량 계산
export const SPEED_ACCELERATION =
    (DIFFICULTY_SETTINGS.GAME_SPEED.MAX - DIFFICULTY_SETTINGS.GAME_SPEED.INITIAL) /
    DIFFICULTY_SETTINGS.GAME_SPEED.TARGET_TIME_SECONDS;
