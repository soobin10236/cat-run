# Cat Run Game - 배포 가이드

## 🌐 접속 방법

### 공개 URL
```
https://YOUR_USERNAME.github.io/cat-run-game/
```

### 비밀번호 보호 (선택적)
접근 제한을 원하면:
1. `index.html`을 `game.html`로 이름 변경
2. `auth.html`을 `index.html`로 이름 변경
3. 비밀번호 설정 (auth.html 내부)
4. 친구에게 비밀번호 공유

---

## 🚀 배포 단계

### 1. GitHub 준비
```powershell
# Git 설치 여부 확인
git --version

# Git 설정 (최초 1회)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2. 저장소 생성 및 업로드
```powershell
# 프로젝트 폴더로 이동
cd c:/Users/soobin/.gemini/antigravity/scratch

# Git 초기화
git init

# .gitignore 생성 (선택적)
# (이미 제공된 .gitignore 사용)

# 모든 파일 스테이징
git add .

# 커밋
git commit -m "🐱 Initial commit: Cat Run Game v1.0"

# GitHub에 업로드 (YOUR_USERNAME을 본인 계정명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/cat-run-game.git
git branch -M main
git push -u origin main
```

### 3. GitHub Pages 활성화
1. https://github.com/YOUR_USERNAME/cat-run-game 접속
2. **Settings** → **Pages**
3. **Source**: `main` 브랜치 선택
4. **Save** 클릭
5. 1-2분 대기

---

## 🛡️ 보안 체크리스트

### ✅ 자동 적용
- [x] HTTPS 암호화
- [x] DDoS 방어 (Cloudflare CDN)
- [x] `.git` 폴더 숨김

### 🔒 추가 보안 (선택적)
- [ ] 비밀번호 보호 (`auth.html` 사용)
- [ ] `.gitignore`로 민감 파일 제외
- [ ] 코드 난독화 (상업적 배포 시)

---

## 🔄 업데이트 방법

게임을 수정한 후:

```powershell
# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋
git commit -m "Update: 게임 밸런스 조정"

# GitHub에 푸시
git push
```

**자동 배포**: 푸시 후 1-2분 내 자동 반영됨

---

## 👥 친구 초대 방법

### 공개 링크
```
https://YOUR_USERNAME.github.io/cat-run-game/
```

### 비밀번호 보호 시
1. 위 링크 공유
2. 비밀번호 별도 전달 (예: `catrun2024`)

---

## 📊 접속 통계 (선택적)

**Google Analytics 추가** (무료):

1. https://analytics.google.com 가입
2. 추적 코드 발급
3. `index.html` (또는 `game.html`) `<head>` 안에 추가:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**확인 가능한 정보**:
- 방문자 수
- 접속 시간
- 플레이 시간
- 지역 분포

---

## 🐛 문제 해결

### 1. 게임이 안 보여요
- **원인**: 경로 문제
- **해결**: `Assets.js`의 경로가 상대 경로인지 확인

### 2. 이미지가 안 나와요
- **원인**: 리소스 파일 누락
- **해결**: `src/assets/` 폴더가 GitHub에 업로드되었는지 확인

### 3. 사운드가 안 나와요
- **원인**: 브라우저 자동재생 정책
- **해결**: 정상 (사용자 클릭 후 재생됨)

---

## 🔐 비밀번호 보호 사용법

### 활성화
```powershell
# 파일 이름 변경
mv index.html game.html
mv auth.html index.html
```

### 비밀번호 설정
`index.html` (원래 auth.html) 파일 수정:
```javascript
const CORRECT_PASSWORD = "새비밀번호"; // 변경
```

### 비활성화
```powershell
# 원래대로 되돌리기
mv index.html auth.html
mv game.html index.html
```

---

## 💡 팁

### 도메인 연결 (선택적)
무료 도메인:
- **Freenom**: `.tk`, `.ml` 등 무료 도메인
- **GitHub Pages 커스텀 도메인**: Settings → Pages → Custom domain

### 성능 최적화
- 이미지 압축: https://tinypng.com
- 코드 압축: https://javascript-minifier.com (선택적)

---

## 📞 지원

문제가 생기면:
1. GitHub Issues 확인
2. README.md 참고
3. 개발자에게 문의

---

**Happy Gaming! 🐱💨**
