# 내일나이테

Next.js App Router와 TypeScript로 개발하는 내일나이테 웹 서비스입니다.

## 개발 환경

- Node.js 24.x (`.nvmrc` 기준)
- pnpm 10.10.0 (`package.json`의 `packageManager` 기준)

nvm을 사용한다면 다음 명령으로 Node 버전을 맞춥니다.

```bash
nvm install
nvm use
```

pnpm 10.10.0을 설치한 환경에서 의존성을 설치하고 개발 서버를 실행합니다.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

브라우저에서 <http://localhost:3000>에 접속합니다.

## 주요 명령어

| 명령어              | 용도                                        |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | 개발 서버 실행                              |
| `pnpm lint`         | ESLint 검사                                 |
| `pnpm typecheck`    | Next.js 라우트 타입 생성 후 TypeScript 검사 |
| `pnpm format`       | Prettier 서식 적용                          |
| `pnpm format:check` | 서식 검사                                   |
| `pnpm build`        | 프로덕션 빌드                               |
| `pnpm start`        | 빌드 결과로 프로덕션 서버 실행              |

`LayoutProps` 등 Next.js 생성 타입을 사용하므로, 별도 타입 검사는 `pnpm typecheck`로 실행합니다.
현재 Geist 폰트를 `next/font/google`로 불러오므로 빌드 시 Google Fonts에 접근할 수 있어야 합니다.

## 프로젝트 구조

- `src/app`: 페이지, 루트 레이아웃, 전역 스타일
- `src/components/ui`: shadcn UI 컴포넌트
- `src/lib`: 공통 유틸리티
- `public`: 정적 파일
- `.github/workflows/ci.yml`: 자동 검증

UI는 Tailwind CSS와 shadcn을 사용합니다. 이력서 기능은 Supabase 인증·DB와 서버 로컬 첨부 파일 저장소를 사용합니다. 기본 레이아웃은 환경변수 없이 확인할 수 있습니다.

## 자동 검증

GitHub Actions는 `main` 브랜치 push와 pull request에서 의존성을 lockfile 기준으로 설치하고 lint, 타입, 서식, 프로덕션 빌드를 순서대로 검사합니다. Actions 화면에서 수동 실행할 수도 있습니다.

로컬과 CI 모두 `.nvmrc`의 Node 버전과 `package.json`의 pnpm 버전을 사용합니다.

## 이력서 기능 설정

1. `.env.example`을 참고해 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정합니다. service_role 키는 사용하지 않습니다.
2. Supabase SQL Editor 또는 마이그레이션 도구에서 `supabase/migrations/202609230001_resumes.sql`을 적용합니다.
3. Supabase Auth에서 Email 인증을 활성화하고 Site URL을 개발 시 `http://localhost:3000`으로 설정합니다.
4. 가입 확인 메일(Confirm signup)의 링크를 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`로 설정합니다. 인증 후 고정된 `/resumes` 경로로 이동합니다.
5. 개발 서버를 다시 시작하고 `/login`에서 가입 및 로그인합니다.

이력서는 이름·자유 형식 본문·변경 메모로 등록합니다. 최초 등록 시 v1, 수정 저장 시 새 버전이 생성됩니다. 이전 버전의 복원은 현재 내용을 바꾸는 새 버전을 추가하며 기존 기록을 보존합니다. 동시 수정은 부모 행 잠금과 예상 버전 비교로 충돌을 감지합니다. 사용자의 저장·복원 승인은 각 버전의 `approved_at`, 복원 출처는 `restored_from_version`에 기록합니다.

### 파일 저장

- PDF, DOCX, TXT 파일 1개를 버전별로 첨부할 수 있습니다(최대 10MB). 내용 자동 추출은 포함하지 않습니다.
- 첨부 없이 수정하면 직전 첨부를 유지합니다. 새 파일을 첨부해도 이전 버전 파일은 남습니다.
- 기본 경로는 `.data/resumes/<user-id>/<file-id>`이며 Git 및 공개 정적 파일 경로에서 제외합니다. 원본 파일명을 디스크 경로로 사용하지 않습니다.
- `RESUME_STORAGE_DIR`로 저장 위치를 지정할 수 있습니다. 배포 시 영속 디스크가 있는 Node.js 서버가 필요하며 여러 서버를 운영하면 공유 볼륨이 필요합니다. 임시 파일 시스템을 사용하는 서버리스 환경에는 그대로 배포하지 않습니다.
- 파일을 포함한 로컬 디렉터리와 Supabase DB를 함께 백업해야 합니다. DB만 복구하면 원본 첨부를 내려받을 수 없습니다.
- 다운로드할 때마다 로그인 사용자와 버전 소유권을 확인합니다. 파일은 실행·미리보기 없이 다운로드로 제공됩니다. 확장자와 PDF/ZIP 헤더 검사는 완전한 문서 유효성 검사나 악성코드 검사를 대신하지 않습니다.
- 파일 기록 후 DB 오류가 발생하면 전송 결과가 불확실할 수 있어 파일을 즉시 삭제하지 않습니다. 미참조 파일 정리는 백업과 DB 참조 확인 후 별도 운영 작업으로 수행합니다.

### 검증

```bash
node --test tests/*.test.mjs
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

`supabase/tests/resumes.sql`은 마이그레이션이 적용된 **테스트 DB**에서 관리자 역할로 실행합니다. 테스트 사용자 생성, 타 사용자 조회·수정·복원 차단, 익명 접근 차단, 버전 수정·삭제 차단, 충돌 감지, 원본 유지, 복원, 실패한 저장의 롤백을 확인한 뒤 전체 트랜잭션을 롤백합니다. 실제 프로젝트의 이메일 가입·세션 갱신·첨부 다운로드 흐름은 Supabase 설정 후 별도로 확인합니다.
