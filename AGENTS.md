<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 내일나이테 작업 지침

내일나이테는 이력서와 채용공고를 관리하고, 근거 기반 매칭과 지원 과정을 돕는 한국어 웹 서비스다.

## 작업 전 필수 확인

1. `git status --short`로 기존 변경을 확인한다.
2. 기존 변경은 사용자 작업으로 간주하고 덮어쓰거나 되돌리지 않는다.
3. 관련 파일과 기존 구현 패턴을 읽은 뒤 최소 범위로 수정한다.
4. Next.js 작업은 위 자동 관리 블록에 따라 설치된 버전의 로컬 문서를 확인한다.

## 상세 문서 라우팅

- 제품 범위, MVP 우선순위, 사용자 흐름 또는 UX 작업: `docs/product.md`를 읽는다.
- DB 스키마, 이력서 버전, 공고, 매칭 또는 지원 데이터 작업: `docs/domain.md`를 읽는다.
- AI 추출, 매칭, 생성, 프롬프트 또는 사용자 승인 작업: `docs/ai-safety.md`를 반드시 읽는다.
- 여러 영역에 걸친 작업이면 해당 문서를 모두 읽는다. 관련 없는 문서는 읽지 않는다.

## 기술 기준

- Next.js App Router와 TypeScript를 사용한다.
- UI는 Tailwind CSS와 기존 shadcn 컴포넌트를 우선 사용하고 아이콘은 Lucide React를 사용한다.
- 폼은 React Hook Form과 Zod를 사용하며 외부 입력을 런타임에서 검증한다.
- 인증과 영속 데이터는 Supabase를 사용하고 SSR 세션은 `@supabase/ssr` 기준으로 구현한다.
- TanStack Query는 클라이언트 서버 상태에, Zustand는 임시 UI 상태에만 사용한다. Zustand를 서버 데이터의 원본 저장소로 사용하지 않는다.
- 페이지 전체를 불필요하게 Client Component로 만들지 않는다.
- `any` 사용을 피한다.

## 변경 원칙

- 불명확한 요구사항으로 제품 정책을 만들어내지 않는다. 안전한 최소 구현을 선택하고 가정을 명시하거나 사용자에게 확인한다.
- 구현 범위 밖의 리팩터링이나 패키지 업그레이드를 함께 수행하지 않는다.
- 새 패키지가 필요하면 설치 전에 패키지명, 목적, 기존 구성으로 해결할 수 없는 이유, 번들 및 유지보수 영향을 먼저 제안하고 승인을 받는다.
- DB 변경에는 마이그레이션과 사용자 소유권 기반 RLS 정책 및 테스트를 함께 작성한다.
- 원본 문서, 버전, AI 제안, 승인 결과와 실제 제출본을 서로 덮어쓰지 않는다.
- 서비스 키, 비밀키, 토큰 또는 실제 `.env*` 값을 커밋하거나 클라이언트에 노출하지 않는다.
- 로그와 오류 메시지에 이력서 원문이나 개인정보를 불필요하게 남기지 않는다.
- 삭제, 외부 전송, 지원 완료 처리처럼 영향이 큰 작업에는 사용자 확인 절차를 둔다.

## 검증과 보고

- 변경 범위에 맞는 관련 테스트를 먼저 실행한다.
- 코드 변경은 기본적으로 `pnpm lint`, `pnpm typecheck`, `pnpm format:check`를 확인한다.
- 라우팅, 환경, 빌드 설정, 인증, DB 또는 배포에 영향을 주는 변경은 `pnpm build`도 확인한다.
- 문서만 변경했다면 문서 형식과 링크만 확인하고 전체 빌드는 생략할 수 있다.
- 실행하지 못한 검증과 이유를 최종 보고에 명시한다.
- 완료 보고에는 변경 내용, 검증 결과, 남은 위험 또는 후속 작업만 간결하게 적는다.
