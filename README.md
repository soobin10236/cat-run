# 🐱 Cat Run Game - 개발자 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [게임 설계](#게임-설계)
5. [주요 클래스 설명](#주요-클래스-설명)
6. [게임 밸런스 수치](#게임-밸런스-수치)
7. [개발 환경 설정](#개발-환경-설정)
8. [수정 가이드](#수정-가이드)

---

## 프로젝트 개요

**Cat Run Game**은 HTML5 Canvas와 Vanilla JavaScript로 제작된 무한 러닝 게임입니다.

### 게임 컨셉
- **장르**: 2D 무한 러닝 (Endless Runner)
- **테마**: 뒷골목을 달리는 고양이
- **조작**: 점프(↑/Space), 슬라이드(↓)
- **목표**: 장애물을 피하고 아이템을 수집하며 최고 점수 달성

---

## 기술 스택

### 코어 기술
- **HTML5 Canvas**: 게임 렌더링
- **Vanilla JavaScript (ES6+)**: 게임 로직
- **CSS3**: UI 스타일링
- **Web Audio API**: 효과음 재생

### 주요 기능
- ✅ 스프라이트 애니메이션 (플레이어, 드론)
- ✅ 물리 엔진 (중력, 가변 점프)
- ✅ 충돌 감지 (AABB)
- ✅ 동적 난이도 조절
- ✅ 일시정지 기능
- ✅ 탭 전환 시 자동 일시정지
- ✅ BGM 및 효과음

---

## 프로젝트 구조

```
scratch/
├── index.html              # 메인 HTML (게임 컨테이너, UI)
├── style.css               # 전역 스타일
├── server.ps1              # 로컬 개발 서버 (PowerShell)
│
└── src/
    ├── main.js             # 진입점 (게임 초기화)
    ├── GameManager.js      # 게임 루프, 상태 관리, 충돌 처리
    │
    ├── constants/
    │   └── Assets.js       # 리소스 경로 관리
    │
    ├── entities/
    │   ├── Player.js       # 플레이어 (고양이)
    │   ├── Obstacle.js     # 장애물 (지상/공중)
    │   ├── Item.js         # 아이템 (황금 생선)
    │   └── Background.js   # 배경 (무한 스크롤)
    │
    ├── utils/
    │   ├── InputHandler.js # 키보드 입력 처리
    │   └── AudioManager.js # 오디오 재생 관리
    │
    └── assets/
        ├── images/         # 이미지 리소스
        └── audio/          # 오디오 리소스
```

---

## 게임 설계

### 게임 루프 구조

```
requestAnimationFrame
  ↓
gameLoop(timestamp)
  ├── deltaTime 계산
  ├── update(deltaTime)  → 게임 로직 업데이트
  │   ├── Background.update()
  │   ├── Player.update()
  │   ├── Obstacles.update()
  │   ├── Items.update()
  │   ├── 충돌 감지
  │   ├── 점수 증가
  │   └── 속도 증가
  └── draw()             → 화면 렌더링
      ├── Background.draw()
      ├── Player.draw()
      ├── Obstacles.draw()
      └── Items.draw()
```

### 상태 관리

```javascript
GameManager {
  isGameStarted: false → true  // 게임 시작 여부
  isGameOver: false → true     // 게임 오버 여부
  isPaused: false ⇄ true       // 일시정지 토글
}
```

### 엔티티 생명주기

```
생성 → 업데이트 → 충돌 체크 → 삭제 판정 → 제거
  ↓       ↓          ↓             ↓
 new   update()  checkCollision()  filter()
```

---

## 주요 클래스 설명

### 1. **GameManager** (게임 총괄)
**역할**: 게임 루프, 엔티티 관리, 충돌 감지, UI 업데이트

**주요 메서드**:
- `update(deltaTime)`: 게임 상태 업데이트
- `draw()`: 화면 렌더링
- `checkCollision(a, b)`: AABB 충돌 감지
- `togglePause()`: 일시정지 토글
- `restart()`: 게임 재시작

**핵심 로직**:
```javascript
// 장애물 생성 간격 동적 계산
const speedReduction = this.gameSpeed * 350;
const scoreReduction = this.score * 0.2;
const baseInterval = 2200 - speedReduction - scoreReduction;
this.obstacleInterval = Math.max(baseInterval, 300) + Math.random() * 300;
```

---

### 2. **Player** (플레이어)
**역할**: 고양이 캐릭터 조작, 애니메이션, 물리 연산

**상태**:
- `RUN`: 달리기 (프레임 0-7)
- `JUMP`: 점프 (프레임 8-11)
- `SLIDE`: 슬라이드 (프레임 12-15)

**핵심 로직**:
```javascript
// 가변 점프: 키를 빨리 떼면 낮게 점프
if (!키입력 && this.vy < 0) {
    this.vy *= 0.5;
}
```

---

### 3. **Obstacle** (장애물)
**역할**: 장애물 생성 및 관리

**타입**:
- **지상 장애물** (60%): 허들(100px), 쓰레기통(100px, 30%)
- **공중 장애물** (40%): 드론 (80x80, 애니메이션)

**생성 로직**:
```javascript
const isGround = Math.random() < 0.6;
if (isGround) {
    // 지상 장애물
    if (Math.random() < 0.3) {
        // 긴 장애물 (쓰레기통)
    } else {
        // 일반 장애물 (허들)
    }
} else {
    // 공중 장애물 (드론)
    this.isAnimated = true; // 스프라이트 애니메이션
}
```

---

### 4. **Item** (아이템)
**역할**: 황금 생선 아이템 (보너스 점수)

**보상**: +50점

**출현**: 30% 확률, 랜덤 높이

---

### 5. **Background** (배경)
**역할**: 무한 스크롤 배경

**구현**:
```javascript
// 이미지 2장을 이어붙여 무한 스크롤
this.x1 -= gameSpeed;
this.x2 -= gameSpeed;

if (this.x1 <= -width) {
    this.x1 = this.x2 + width;
}
```

---

## 게임 밸런스 수치

### 플레이어
```javascript
width: 80px
height: 80px (슬라이드 시 56px)
jumpPower: 12
weight (중력): 0.5
히트박스: 50% (40x40)
```

### 장애물
```javascript
// 지상 장애물
일반: 100x50, 히트박스 X축 70%
긴 장애물: 100x50, 히트박스 X축 70%

// 공중 장애물 (드론)
크기: 80x80
히트박스: X축 60%, Y축 20% (납작함)
애니메이션: 1x4 스프라이트, 10 FPS
```

### 아이템
```javascript
크기: 50x50
히트박스: 80% (쉽게 획득)
보너스 점수: +50점
```

### 게임 속도
```javascript
초기 속도: 3
최대 속도: 4.5 (눈의 피로 방지)
속도 증가율: +0.001 per frame
```

### 난이도 조절
```javascript
// 장애물 생성 간격 (ms)
기본 간격: 2200ms
속도 감소: gameSpeed * 350
점수 감소: score * 0.2
최소 간격: 300ms
랜덤 편차: ±300ms
```

### 점수 계산
```javascript
// 거리 점수
score += (gameSpeed * deltaTime) * 0.01

// 아이템 보너스
score += 50
```

---

## 개발 환경 설정

### 1. 서버 실행

**Windows (PowerShell)**:
```powershell
# 실행 권한 설정 (최초 1회)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 서버 시작
.\server.ps1
```

**브라우저**:
```
http://localhost:8000
```

### 2. 파일 구조 유지
- **이미지**: `src/assets/images/`에 저장
- **오디오**: `src/assets/audio/`에 저장
- **스프라이트 시트**: 4x4 그리드 (플레이어), 1x4 그리드 (드론)

### 3. 리소스 경로 관리
모든 리소스 경로는 `src/constants/Assets.js`에서 관리:

```javascript
export const ASSETS = {
    IMAGES: {
        PLAYER: 'src/assets/images/cat_spritesheet_v5.png',
        OBSTACLE_AIR: 'src/assets/images/obstacle_air.png',
        // ...
    },
    AUDIO: {
        BGM: 'src/assets/audio/bgm.mp3',
        JUMP: 'src/assets/audio/meow.mp3'
    }
};
```

---

## 수정 가이드

### ⚙️ 게임 밸런스 조정

#### 1. 최대 속도 변경
```javascript
// GameManager.js - constructor
this.MAX_GAME_SPEED = 4.5; // 값 조정
```

#### 2. 장애물 생성 빈도 조정
```javascript
// GameManager.js - update()
const speedReduction = this.gameSpeed * 350; // 계수 조정 (↑ 더 빠르게)
const scoreReduction = this.score * 0.2;     // 계수 조정 (↑ 더 빠르게)
const baseInterval = 2200;                   // 기본값 조정 (↓ 더 자주)
const minInterval = 300;                     // 최소값 조정 (↓ 더 촘촘)
```

#### 3. 점프력 조정
```javascript
// Player.js - constructor
this.jumpPower = 12; // 값 조정 (↑ 더 높게)
this.weight = 0.5;   // 값 조정 (↑ 더 빠르게 떨어짐)
```

#### 4. 히트박스 조정
```javascript
// GameManager.js - checkCollision()
const aWidth = a.width * 0.5;  // 플레이어 (↓ 더 쉽게)
scaleX = 0.7; // 지상 장애물 (↓ 더 쉽게)
scaleY = 0.2; // 드론 Y축 (↓ 더 쉽게)
```

---

### 🎨 그래픽 교체

#### 1. 플레이어 스프라이트 시트 교체
```javascript
// Assets.js
PLAYER: 'src/assets/images/새_스프라이트.png'

// Player.js - draw()
// 4x4 그리드 유지 필요
// 프레임 0-7: 달리기
// 프레임 8-11: 점프
// 프레임 12-15: 슬라이드
```

#### 2. 배경 이미지 교체
```javascript
// Assets.js
BACKGROUND: 'src/assets/images/새_배경.png'

// 주의: 이미지가 반복되므로 좌우가 이어지도록 제작
```

---

### 🔊 사운드 조정

#### 1. 볼륨 조절
```javascript
// AudioManager.js - constructor
this.bgmAudio.volume = 0.3;    // BGM (0.0 ~ 1.0)
this.jumpAudio.volume = 0.2;   // 점프 효과음
```

#### 2. 사운드 파일 교체
```javascript
// Assets.js
BGM: 'src/assets/audio/새_배경음.mp3',
JUMP: 'src/assets/audio/새_점프음.mp3'
```

---

### 🆕 새로운 엔티티 추가

#### 예시: 파워업 아이템 추가

**1. 클래스 생성** (`src/entities/PowerUp.js`):
```javascript
export class PowerUp {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = this.game.width;
        this.y = /* 랜덤 높이 */;
        this.markedForDeletion = false;
    }
    
    update(deltaTime) {
        this.x -= this.game.gameSpeed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }
    
    draw(ctx) {
        // 그리기 로직
    }
}
```

**2. GameManager에 통합**:
```javascript
// constructor
this.powerUps = [];

// update()
if (/* 생성 조건 */) {
    this.powerUps.push(new PowerUp(this));
}

this.powerUps.forEach(powerUp => {
    powerUp.update(deltaTime);
    if (this.checkCollision(this.player, powerUp)) {
        // 파워업 효과 적용
    }
});

// draw()
this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
```

---

## 🐛 디버깅 팁

### 1. 히트박스 시각화
```javascript
// Player.js, Obstacle.js, Item.js - draw()
ctx.strokeStyle = 'red';
ctx.strokeRect(this.x, this.y, this.width, this.height);
```

### 2. 콘솔 로그
```javascript
// GameManager.js - update()
console.log('Score:', this.score, 'Speed:', this.gameSpeed);
```

### 3. 테스트 모드
```javascript
// GameManager.js - constructor
this.gameSpeed = this.MAX_GAME_SPEED; // 최고 속도로 시작
```

---

## 📝 코드 스타일 가이드

### 명명 규칙
- **클래스**: PascalCase (`GameManager`, `Player`)
- **메서드/변수**: camelCase (`update`, `gameSpeed`)
- **상수**: UPPER_SNAKE_CASE (`MAX_GAME_SPEED`, `ASSETS`)

### 주석
- **파일 헤더**: 클래스 역할 설명
- **메서드**: JSDoc 형식
- **중요 로직**: 인라인 주석

---

## 🎯 성능 최적화

### 현재 최적화 사항
1. ✅ **deltaTime 캡핑**: 탭 전환 시 비정상 동작 방지
2. ✅ **엔티티 풀링**: 화면 밖 엔티티 즉시 삭제
3. ✅ **requestAnimationFrame**: 브라우저 최적화 활용
4. ✅ **Page Visibility API**: 비활성 탭 자동 일시정지

### 추가 최적화 아이디어
- 스프라이트 아틀라스 사용
- 오프스크린 캔버스 활용
- Web Worker로 물리 연산 분리

---

## 🚀 배포

### GitHub Pages 배포
1. GitHub 저장소 생성
2. 코드 푸시
3. Settings → Pages → Source: main branch

### 정적 호스팅
- Netlify, Vercel, Cloudflare Pages 등 사용 가능

---

## 📚 참고 자료

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

## 🤝 기여 가이드

1. 이슈 등록 또는 기능 제안
2. 브랜치 생성 (`feature/새기능`)
3. 코드 작성 및 테스트
4. Pull Request 생성

---

**Happy Coding! 🐱💨**
