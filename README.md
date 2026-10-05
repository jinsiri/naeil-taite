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
- 이전 로컬 이력서의 읽기·이전 경로만: `RESUME_STORAGE_DIR` (신규 업로드에는 사용하지 않음)
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
supabase/migrations/202610020001_resume_storage.sql
supabase/migrations/202610020001_scoring_weights_default.sql
supabase/migrations/202610060001_independent_applications.sql
supabase/migrations/202610060002_submitted_resumes.sql
supabase/migrations/202610060003_next_actions.sql
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
- 전송 동의 후 브라우저에서 Supabase의 비공개 `resume-originals` 버킷으로 직접 업로드합니다. Vercel에는 파일 식별자만 전달하므로 6MB 파일도 요청 본문 제한에 걸리지 않습니다.
- 앱 서버는 로그인 사용자와 파일 소유권을 확인한 뒤 Storage에서 파일을 읽어 내용을 추출합니다. 이 단계에서는 AI 서비스로 보내지 않습니다.
- 추출 내용을 확인하고 저장하면 본문·버전 정보와 원본 파일을 연결합니다. 파일은 `<user-id>/<file-id>`로 보관하며 기존 원본을 덮어쓰지 않습니다.
- TXT는 UTF-8 형식이어야 합니다. 이력서는 직접 작성하거나 추출 내용을 편집할 수 있습니다.
- 수정·복원은 새 버전을 만듭니다. 본문만 수정할 때 원본 파일을 중복 업로드하지 않으며, 동시 수정은 버전 비교로 충돌을 감지합니다.
- 다운로드 시 소유권을 확인하고 60초 유효한 다운로드 링크로 이동합니다. 파일 바이트는 Vercel을 거치지 않습니다.
- 실패·취소·탭 종료 후 남은 원본은 편집 화면의 **미저장 업로드 정리하기**에서 확인 후 삭제합니다. 자동 삭제는 하지 않습니다. 다른 창에서 작성 중인 파일을 삭제하면 그 파일을 다시 선택해야 합니다.
- 저장과 삭제는 동일한 파일 행을 잠가 처리하므로 저장된 버전의 원본은 정리 대상으로 삭제할 수 없습니다. 삭제 응답이 유실되어도 다시 시도할 수 있습니다.

### Vercel 배포 준비

1. `202610020001_resume_storage.sql`을 기존 마이그레이션 이후 적용합니다. 비공개 버킷, 10MB 제한, 사용자 소유권 정책과 업로드 관리 테이블이 생성됩니다.
2. Vercel에 기존 Supabase URL·공개 키와 OpenAI 환경변수를 설정합니다. 일반 업로드·추출·다운로드에 서비스 키는 필요하지 않습니다.
3. 기존 로컬 원본이 있다면 아래 도구로 이전합니다. SQL만 적용해도 파일 바이트가 자동으로 옮겨지지는 않습니다.
4. 배포 후 실제 6MB PDF의 업로드 → 추출 → 승인 저장 → 원본 다운로드를 확인합니다. Supabase 프로젝트 자체의 전역 업로드 제한도 10MB 이상이어야 합니다.
5. 원본은 Storage에, 본문·버전 정보는 DB에 있으므로 둘 다 백업합니다.

### 기존 로컬 원본 이전

기존 `.data/resumes/<user-id>/<file-id>` 파일과 버전 기록은 삭제하거나 덮어쓰지 않습니다. 이전 완료 전에는 기존 서버에서 로컬 다운로드가 가능하며, Vercel에서는 미이전 원본 안내가 표시됩니다.

로컬 터미널 환경에 `SUPABASE_SERVICE_ROLE_KEY`를 설정하고 다음을 실행합니다. 이 키는 이전 도구 전용이며 브라우저나 Vercel 앱에 등록하지 않습니다. `.env.local`의 Supabase URL이 이전할 DB와 같은지 확인하세요.

```bash
# 파일 수·크기 사전 확인만 수행 (원격 파일 업로드 없음)
node --env-file=.env.local scripts/migrate-resume-files.mjs

# 실제 업로드 후 SHA-256으로 원본 일치 검증
node --env-file=.env.local scripts/migrate-resume-files.mjs --apply
```

- 경로가 다르면 `RESUME_STORAGE_DIR`에 기존 저장 폴더를 지정합니다.
- 이미 업로드된 파일은 덮어쓰지 않고 내용 일치 여부를 확인하므로 중단 후 재실행할 수 있습니다.
- 검증에 성공한 파일만 Storage 연결로 전환합니다. 원본 누락·불일치·실패가 있으면 종료 코드 1과 집계 결과를 반환합니다.
- 실제 파일명·개인정보·서비스 키는 출력하지 않습니다. 원본이 없는 경우 기존 서버 백업에서 복구한 뒤 재실행하세요.

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
- `supabase/tests/resume_storage.sql` — 파일 소유권, 저장 전 업로드, 원본 보호, 취소·삭제 재시도 (Storage 메타데이터 SQL 검증; 실제 바이트 전송은 별도 확인)
- `supabase/tests/job_postings.sql` — 공고 소유권과 원문 보호
- `supabase/tests/job_reviews.sql` — 평가 스냅샷, 지원 단계, 복원
- `supabase/tests/scoring_preferences.sql` — 평가 설정과 RLS 정책

AI 이력서 대조는 의미를 이해하는 판정이 아닙니다. 근거 확인을 위한 보조 정보로 사용하세요.

## 독립 지원 기록

- 공고 저장 시 지원 기록이 함께 생성됩니다. AI 분석 없이 단계를 관리할 수 있습니다.
- 기존 평가의 단계는 ‘확인 필요’로 옮깁니다. 공고 상세 또는 지원 현황에서 실제 단계를 확인하세요. 기존 평가 이력은 보존됩니다.
- 재분석·평가 복원은 지원 단계를 바꾸지 않습니다. 단계 변경은 별도 이벤트로 쌓이며 다른 창의 오래된 변경은 거절됩니다.
- `supabase/tests/applications.sql`에서 소유권, 승인, 버전 충돌, 재분석과의 독립성을 검증합니다.

## 실제 제출본

공고 상세에서 실제 제출 파일을 새로 업로드하거나, 온라인 지원서에 사용한 이력서 본문 버전을 선택해 제출일과 함께 확정합니다. 본문을 선택하면 첨부 원본은 복사하지 않습니다. 확정 기록은 수정하지 않으며 정정·재제출은 메모와 함께 새 기록으로 추가합니다. 제출본 확정은 지원 단계를 자동 변경하지 않습니다. 업로드 후 확정하지 않은 파일은 미저장 업로드 목록에서 정리할 수 있습니다. 확정된 파일은 정리할 수 없습니다. 공고를 삭제하면 제출본 기록도 삭제되며 Storage 원본은 남습니다.

`supabase/tests/submitted_resumes.sql`은 승인, 소유권, 불변 본문, 파일 보호, 재시도 중복 방지를 검증합니다.

## 다음 행동과 기한

- 공고 상세에서 행동·메모·선택 기한을 추가하고, 항목을 펼쳐 수정하거나 완료·미완료로 바꿉니다. 날짜는 한국 날짜 기준으로 표시합니다.
- 회고의 ‘다음에 해볼 일’에서 **다음 행동으로 가져오기**를 누르면 초안이 채워집니다. 사용자가 저장하기 전에는 행동이 만들어지지 않습니다.
- 대시보드는 미완료 행동 중 기한이 빠른 6개를 보여줍니다. 기한이 지난 항목과 오늘까지인 항목을 구별합니다. 자동 알림·외부 캘린더 전송은 포함하지 않습니다.
- `supabase/tests/next_actions.sql`은 사용자 소유권, 회고 출처 연결, 완료·재개, 충돌 및 생성 재시도를 검증합니다.
