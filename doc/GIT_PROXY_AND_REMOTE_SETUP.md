# Git 프록시/Remote 설정 가이드 (Codex 런타임 포함)

이 문서는 다음 두 가지를 한 번에 해결하기 위한 가이드입니다.

1. 프록시 때문에 `CONNECT tunnel failed, response 403` 가 나는 환경에서 GitHub 연결 점검
2. Codex가 사용하는 로컬 Git 저장소(`.git/config`)에 `origin remote`를 정확히 설정

---

## 1) 가장 빠른 실행 방법

> 저장소 루트(`/workspace/pdf-sign`)에서 실행

```bash
./scripts/git-proxy-helper.sh setup \
  --repo /workspace/pdf-sign \
  --remote-url https://github.com/jkoogihw/pdf-sign.git \
  --proxy-url http://proxy:8080
```

옵션:

- 프록시 우회 도메인 지정이 필요하면:

```bash
./scripts/git-proxy-helper.sh setup \
  --repo /workspace/pdf-sign \
  --remote-url https://github.com/jkoogihw/pdf-sign.git \
  --proxy-url http://proxy:8080 \
  --no-proxy github.com,api.github.com
```

---

## 2) Codex 저장소 config에 remote 설정하는 방법

Codex가 보는 저장소 설정은 일반 Git과 동일하게 `.git/config`에 저장됩니다.

### 접근 경로

- 파일 경로: `/workspace/pdf-sign/.git/config`
- 확인 명령:

```bash
nl -ba /workspace/pdf-sign/.git/config
```

### remote 설정 명령(권장)

```bash
# origin이 없으면 추가
git -C /workspace/pdf-sign remote add origin https://github.com/jkoogihw/pdf-sign.git

# origin이 이미 있으면 URL 업데이트
git -C /workspace/pdf-sign remote set-url origin https://github.com/jkoogihw/pdf-sign.git

# 확인
git -C /workspace/pdf-sign remote -v
```

`remote -v`에 아래처럼 나오면 정상입니다.

- `origin https://github.com/jkoogihw/pdf-sign.git (fetch)`
- `origin https://github.com/jkoogihw/pdf-sign.git (push)`

---

## 3) 인증(PAT) 적용 팁

PAT는 채팅/문서에 절대 평문으로 남기지 마세요.

```bash
export GITHUB_PAT='새_토큰'
```

필요할 때 1회성으로 fetch 테스트:

```bash
git -C /workspace/pdf-sign \
  -c http.extraHeader="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_PAT" | base64 -w0)" \
  fetch origin dev
```

---

## 4) 실패 시 판별 기준

- `CONNECT tunnel failed, response 403`
  - 인증 이전 단계에서 프록시가 GitHub 443 CONNECT를 차단하는 경우가 대부분
  - 네트워크/보안팀에 `github.com:443` CONNECT 허용 요청 필요

- `Could not read from remote repository`
  - remote URL 오타, 권한 부족, PAT 권한 부족(`repo`) 가능성 확인

---

## 5) 푸시 가능 여부 빠른 점검

```bash
./scripts/git-proxy-helper.sh test --repo /workspace/pdf-sign
```

스크립트는 아래를 자동 확인합니다.

1. `git ls-remote origin`
2. `git push --dry-run origin <현재브랜치>`

---

## 6) 프록시 설정 원복

```bash
./scripts/git-proxy-helper.sh clear-proxy --repo /workspace/pdf-sign
```

- repo local / global git proxy 설정 제거
- 현재 셸의 proxy 환경변수 해제
