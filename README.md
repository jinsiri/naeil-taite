# 내일나이테

이력서·채용공고·지원 과정을 한곳에서 관리하는 한국어 웹 서비스입니다.

## 만든 이유와 쓸모

- **만든 이유:** 실제 구직 중 공고, 이력서 버전, 마감일, 지원 단계를 한곳에서 관리하고 싶어 빠르게 시작했습니다.
- **개발 실험:** 짧은 시간 동안 AI 바이브 코딩으로 어디까지 구현할 수 있는지 살펴봅니다.
- **유용한 사람:** 여러 회사에 지원하며 공고·제출 이력서·전형 단계·회고를 함께 관리하고 싶은 구직자

## 주요 기능

- **이력서 관리:** PDF·DOCX·TXT에서 내용 추출, 직접 편집, 버전 보관
- **공고 관리:** 공고 원문과 마감일 저장
- **근거 기반 분석:** 이력서와 공고 비교, AI 제안 검토
- **지원 관리:** 전형 단계, 변경 이력, 공고별 회고 기록
- **출퇴근 평가:** 설정한 출발 위치부터 공고 근무지까지 대중교통 시간 반영

## 빠른 시작

### 필요 환경

- Node.js 24.x (`.nvmrc`)
- pnpm 10.10.0 (`package.json`)

```bash
nvm install
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

### 자주 쓰는 명령어

| 명령어              | 용도                                 |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | 개발 서버                            |
| `pnpm lint`         | ESLint 검사                          |
| `pnpm typecheck`    | Next.js 타입 생성 및 TypeScript 검사 |
| `pnpm format`       | Prettier 적용                        |
| `pnpm format:check` | 서식 검사                            |
| `pnpm build`        | 프로덕션 빌드                        |
| `pnpm start`        | 프로덕션 서버                        |

## 프로젝트 구조

- `src/app` — 페이지와 서버 액션
- `src/components` — 화면 및 UI 컴포넌트
- `src/lib` — 도메인 로직과 공통 유틸리티
- `supabase/migrations` — DB 스키마 변경
- `supabase/tests` — RLS·DB 검증용 SQL
- `tests` — Node.js 단위 테스트
- `.github/workflows/ci.yml` — GitHub Actions 검사

기술 구성: Next.js App Router · TypeScript · Tailwind CSS · shadcn · Supabase

## 서비스 설정

### 1. 환경 변수

`.env.example`을 복사해 `.env.local`을 만들고 필요한 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

선택 설정:

- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- 이력서 파일 저장 경로: `RESUME_STORAGE_DIR`
- 대중교통 예상 시간: `KAKAO_REST_API_KEY`

`OPENAI_API_KEY`와 Supabase `service_role` 키는 `NEXT_PUBLIC_` 변수로 설정하지 마세요.

### 2. Supabase 데이터베이스

아래 마이그레이션을 **순서대로** Supabase SQL Editor 또는 마이그레이션 도구에서 적용합니다.

```text
supabase/migrations/202609230001_resumes.sql
supabase/migrations/202609280001_job_postings.sql
supabase/migrations/202609280002_job_reviews.sql
supabase/migrations/202609280003_ai_job_reviews.sql
supabase/migrations/202609300001_job_posting_delete.sql
supabase/migrations/202609300002_scoring_preferences.sql
supabase/migrations/202609300003_scoring_origin_location.sql
supabase/migrations/202610010001_application_reflections.sql
```

### 3. 이메일 로그인

- Supabase Auth에서 Email 인증을 활성화합니다.
- 개발용 Site URL: `http://localhost:3000`
- Confirm signup 링크:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

가입 후 `/login`에서 로그인합니다.

## AI 분석

분석 화면에서 OpenAI 또는 로컬 Ollama를 선택합니다.

| 방식   | 설정 및 처리                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI | 서버 전용 API 키 필요. 회사명은 웹 검색에 사용될 수 있으며, 전송 전 동의를 받습니다. `store: false`를 사용해도 제공자 정책은 별도로 적용됩니다. |
| Ollama | `ollama pull qwen3:8b` 후 사용. 분석 요청은 앱 서버에서 Ollama로 전달되며 회사 웹 검색은 하지 않습니다.                                         |

- Ollama 분석은 공고 원문 최대 12,000자까지 지원합니다. 초과하면 원문을 자르지 않고 분석을 중단합니다.
- 배포 앱에서 Ollama를 쓰려면 앱 서버가 접근할 수 있는 Ollama 주소를 `OLLAMA_BASE_URL`에 설정합니다. 사용자 컴퓨터의 Ollama에는 원격 서버가 자동으로 접근할 수 없습니다.
- 분석 결과는 근거와 함께 이력으로 저장합니다. 원본 이력서는 자동으로 수정하지 않습니다.

## 이력서 파일과 저장

- PDF·DOCX·TXT, 파일당 최대 10MB. PDF는 최대 50페이지이며 이미지 스캔본 OCR은 지원하지 않습니다.
- 텍스트 추출을 위해 파일은 로그인 사용자의 요청으로 앱 서버에 전송됩니다. Supabase나 AI 서비스로 보내지 않습니다.
- 추출 내용을 확인하고 저장한 뒤 본문은 Supabase에, 원본 파일은 앱 서버의 로컬 디스크에 저장합니다.
- TXT는 UTF-8 형식이어야 합니다. 이력서는 직접 작성하거나 추출 내용을 편집할 수 있습니다.
- 수정·복원은 기존 기록을 덮어쓰지 않고 새 버전을 만듭니다. 동시 수정은 버전 비교로 충돌을 감지합니다.

기본 파일 경로는 `.data/resumes/<user-id>/<file-id>`입니다. 경로를 바꾸려면 `RESUME_STORAGE_DIR`을 설정합니다.

### 배포·백업 주의사항

- 파일 저장에는 영속 디스크가 있는 Node.js 서버가 필요합니다.
- 여러 앱 서버를 운영한다면 공유 볼륨을 사용해야 합니다.
- DB와 파일 저장 디렉터리를 함께 백업하세요. DB만 복구하면 첨부 파일을 받을 수 없습니다.
- 첨부 다운로드 때마다 사용자와 파일 소유권을 확인합니다. 파일은 미리보기 없이 다운로드로 제공됩니다.

## 데이터 처리 주의사항

- 공고 삭제를 확인하면 연결된 AI 평가와 지원 기록도 영구 삭제됩니다.
- CI는 `main` 브랜치 push, pull request, 수동 실행에서 lint·타입·서식·빌드를 검사합니다.
- 프로덕션 빌드에서 Geist 폰트를 가져오므로 Google Fonts에 접근할 수 있어야 합니다.

## 검증

```bash
node --test tests/*.test.mjs
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

DB 검증 SQL은 **테스트용 Supabase DB**에서 실행합니다. 테스트 SQL은 끝에서 트랜잭션을 롤백합니다.

- `supabase/tests/resumes.sql` — 소유권, 버전 보존·복원, 충돌 처리
- `supabase/tests/job_postings.sql` — 공고 소유권과 원문 보호
- `supabase/tests/job_reviews.sql` — 평가 스냅샷, 지원 단계, 복원
- `supabase/tests/scoring_preferences.sql` — 평가 설정과 RLS 정책

AI 이력서 대조는 의미를 이해하는 판정이 아닙니다. 근거 확인을 위한 보조 정보로 사용하세요.
