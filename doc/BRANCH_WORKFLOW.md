# 브랜치 작업 절차 가이드

## 📌 개요

## 🧭 Codex 작업 브랜치 규칙 (추가)

앞으로 Codex 작업 시에는 아래 규칙을 기본으로 사용합니다.

- 브랜치명 패턴: `xodex/YYYYMMDD_작업-요약`
  - 예시: `xodex/20260225_add-test-button-to-test-page`
- PR 생성 시 대상(base) 브랜치: **`dev`**
- PR 비교(compare) 브랜치: 작업 브랜치 (`xodex/...`)
- `work` 브랜치는 임시/로컬 용도로만 사용하고, 원격 PR의 compare 브랜치로 사용하지 않습니다.

### 빠른 예시
```bash
# dev 최신화
git checkout dev
git pull origin dev

# 규칙에 맞는 작업 브랜치 생성
git checkout -b xodex/20260225_add-test-button-to-test-page

# 작업 후 커밋
git add .
git commit -m "feat: 테스트 페이지 이동 버튼 UI 개선"

# 원격 브랜치로 푸시
git push -u origin xodex/20260225_add-test-button-to-test-page

# PR 생성 시
# base: dev
# compare: xodex/20260225_add-test-button-to-test-page
```

---


이 문서는 `pdf-sign` 프로젝트의 브랜치 관리 및 배포 전략을 설명합니다.

**브랜치 구조:**
- **main**: 프로덕션 환경 (서비스 배포)
- **dev**: 개발/스테이징 환경 (기능 테스트)

**배포 흐름:**
```
개발(dev) → 테스트 → Pull Request → Code Review → main 머지 → 프로덕션 배포
```

---

## 🔄 작업 흐름

### 1️⃣ 개발 시작 (dev 브랜치에서)

#### 1-1. 로컬 저장소 최신화
```powershell
cd D:\dev\repository\git.jkhw\pdf-sign

# dev 브랜치로 전환
git checkout dev

# 원격 저장소에서 최신 코드 받기
git pull origin dev
```

#### 1-2. 기능 개발
```powershell
# 코드 수정/추가 작업 수행
# 예: 새로운 기능, 버그 수정 등

# 변경사항 확인
git status

# 변경사항 스테이징
git add .

# 커밋 (의미 있는 메시지 작성)
git commit -m "feat: 새로운 기능 추가" 
# 또는
git commit -m "fix: 버그 수정"
# 또는
git commit -m "docs: 문서 수정"
```

#### 1-3. dev 브랜치에 푸시 (스테이징 배포)
```powershell
# dev 브랜치에 푸시
git push origin dev

# ✓ 자동으로 dev-pages.yml 워크플로우 실행
# → https://jkoogihw.github.io/pdf-sign-dev/ 에 배포됨
# → GitHub Actions 탭에서 배포 상태 확인
```

#### 1-4. 스테이징 사이트에서 테스트
```
https://jkoogihw.github.io/pdf-sign-dev/
```
- 기능이 정상 작동하는지 확인
- UI/UX 확인
- 버그 재검증

---

### 2️⃣ 서비스 배포 준비 (Pull Request)

#### 2-1. Pull Request 생성
```
GitHub 웹 → jkoogihw/pdf-sign 저장소 → Pull requests 탭
→ "New pull request" 버튼 클릭

base: main
compare: dev

→ "Create pull request" 버튼 클릭
```

#### 2-2. PR 제목 및 설명
```
제목: feat: [기능 설명]
또는
fix: [버그 설명]

설명:
- 변경 사항 요약
- 테스트 결과
- 관련 이슈 (있으면)
```

**예시:**
```
제목: feat: 드래그앤드롭 기능 추가

설명:
- PDF 파일을 드래그앤드롭으로 업로드 가능하도록 개선
- 스테이징 환경에서 테스트 완료
- 다중 파일 지원
```

---

### 3️⃣ 검토 및 머지 (main 브랜치)

#### 3-1. 자신이 작성한 코드 검토 (혼자 관리하는 경우)
- PR에서 변경사항 확인 (`Files changed` 탭)
- 최종 검증

#### 3-2. PR 머지
```
GitHub 웹 → Pull request 페이지
→ "Merge pull request" 버튼 클릭
→ "Confirm merge" 버튼 클릭

옵션:
- "Create a merge commit" (권장): 이력 유지
- "Squash and merge": 커밋 합치기
- "Rebase and merge": 선형 이력
```

**Git 커맨드로도 가능:**
```powershell
git checkout main
git merge dev
git push origin main

# ✓ 자동으로 static.yml 워크플로우 실행
# → https://jkoogihw.github.io/pdf-sign/ 에 배포됨
```

---

### 4️⃣ 프로덕션 배포 확인

#### 4-1. 배포 상태 확인
```
GitHub → Actions 탭
→ "Deploy static content to Pages" 워크플로우
→ 최신 실행 상태 확인 (✅ Success)
```

#### 4-2. 프로덕션 사이트 확인
```
https://jkoogihw.github.io/pdf-sign/
```
- 변경사항이 반영되었는지 확인
- 브라우저 캐시 초기화 후 확인 (Ctrl+Shift+Del)
- 주요 기능 재검증

---

### 5️⃣ dev 브랜치 현행화 (선택)

#### 5-1. main과 dev 동기화
main 브랜치에 새로운 코드가 추가된 후, dev 브랜치를 최신 상태로 유지하려면:

```powershell
cd D:\dev\repository\git.jkhw\pdf-sign

# dev 브랜치로 전환
git checkout dev

# main 브랜치의 최신 코드를 dev에 병합
git merge main

# 원격에 푸시
git push origin dev
```

**언제 필요한가?**
- main에 hotfix가 추가된 경우
- dev 브랜치가 main과 차이가 많이 날 때
- 차기 개발 준비 전 동기화

---

## 📊 브랜치별 배포 환경

| 항목 | dev 브랜치 | main 브랜치 |
|------|-----------|-----------|
| **용도** | 개발/테스트 | 프로덕션 서비스 |
| **배포 대상** | https://jkoogihw.github.io/pdf-sign-dev/ | https://jkoogihw.github.io/pdf-sign/ |
| **워크플로우** | dev-pages.yml | static.yml |
| **배포 시기** | dev 브랜치 푸시 시 | main 브랜치 푸시 시 |
| **배포 대기시간** | ~10초 | ~10초 |
| **접근 범위** | 개발자만 테스트 | 공개 서비스 |

---

## 🔧 자주 사용하는 Git 명령어

### 브랜치 관리
```powershell
# 현재 브랜치 확인
git branch

# dev 브랜치로 전환
git checkout dev

# 브랜치 생성 및 전환
git checkout -b feature/새기능

# 브랜치 삭제
git branch -d feature/새기능
```

### 변경사항 관리
```powershell
# 변경사항 확인
git status

# 차이점 확인
git diff

# 변경사항 스테이징
git add .        # 모든 파일
git add file.js  # 특정 파일

# 스테이징 취소
git reset

# 커밋
git commit -m "메시지"

# 마지막 커밋 수정
git commit --amend

# 빈 커밋 (테스트용)
git commit --allow-empty -m "메시지"
```

### 동기화
```powershell
# 최신 코드 받기
git pull origin dev

# 푸시
git push origin dev

# 강제 푸시 (주의!)
git push -f origin dev
```

### 이력 확인
```powershell
# 커밋 로그 (간단)
git log --oneline -10

# 커밋 로그 (상세)
git log

# 특정 파일의 변경 이력
git log -- filename.js

# 커밋 상세 확인
git show commit-hash
```

---

## ⚠️ 주의사항

### main 브랜치 보호
- **main 브랜치에는 직접 푸시하지 않기**
- 반드시 PR을 통해 머지하기 (검토 프로세스 확보)
- 실수로 잘못된 코드가 프로덕션에 배포되는 것을 방지

### dev 브랜치 규칙
- dev는 개발/테스트 목적으로 사용
- 안정적이지 않을 수 있으므로 정기적으로 정리
- 주요 변경 전 main과 동기화 권장

### 커밋 메시지 컨벤션
```
feat:   새로운 기능
fix:    버그 수정
docs:   문서 수정
style:  코드 스타일 (포맷, 세미콜론 등)
refactor: 코드 리팩토링
test:   테스트 추가/수정
chore:  빌드, 의존성 등
ci:     CI/CD 설정
```

**예시:**
```
git commit -m "feat: PDF 서명 위치 자동 감지"
git commit -m "fix: 드래그앤드롭 UI 버그 수정"
git commit -m "docs: README 업데이트"
```

---

## 🔄 일반적인 워크플로우 (요약)

```powershell
# 1. dev 브랜치로 시작
git checkout dev
git pull origin dev

# 2. 기능 개발
# ... 코드 수정 ...

# 3. 커밋 및 푸시 (dev에 배포됨)
git add .
git commit -m "feat: 새 기능"
git push origin dev

# 4. 스테이징 사이트에서 테스트
# https://jkoogihw.github.io/pdf-sign-dev/

# 5. 문제없으면 main으로 머지 (프로덕션 배포)
git checkout main
git pull origin main
git merge dev
git push origin main

# 6. 프로덕션 사이트 확인
# https://jkoogihw.github.io/pdf-sign/

# 7. dev와 main 동기화 (선택)
git checkout dev
git merge main
git push origin dev
```

---

## 📞 문제 발생 시

### 배포 실패
1. GitHub Actions 로그 확인
   - https://github.com/jkoogihw/pdf-sign/actions
   - 실패한 워크플로우 상세 로그 확인
2. 일반적인 오류는 `doc/2026-02-22_GitHub_계정변경_및_배포환경_구축.md` 참고

### 로컬 저장소 문제
```powershell
# 최신 상태로 초기화
git fetch origin
git reset --hard origin/dev

# 또는 저장소 재복제
git clone https://github.com/jkoogihw/pdf-sign.git
```

### PR 충돌 (Merge conflict)
```powershell
# 충돌 해결
git fetch origin
git merge origin/main

# 충돌 파일 수동으로 수정한 후
git add .
git commit -m "Resolve merge conflict"
git push origin dev
```

---

## ✅ 체크리스트

### 배포 전 확인사항
- [ ] dev 브랜치에서 최종 테스트 완료
- [ ] 스테이징 사이트 (pdf-sign-dev) 정상 작동 확인
- [ ] PR 제목과 설명 명확하게 작성
- [ ] 커밋 메시지 컨벤션 준수

### 배포 후 확인사항
- [ ] main 워크플로우 성공 (✅)
- [ ] 프로덕션 사이트 배포 확인
- [ ] 주요 기능 재검증
- [ ] 브라우저 캐시 초기화 후 확인

---

## 📚 추가 자료
- [Git 공식 문서](https://git-scm.com/doc)
- [GitHub Flow 가이드](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)

