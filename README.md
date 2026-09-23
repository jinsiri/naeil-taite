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

UI는 Tailwind CSS와 shadcn을 사용합니다. Supabase, TanStack Query, React Hook Form, Zod, Zustand는 의존성에 포함되어 있으며 서비스 연결 코드는 아직 추가되지 않았습니다. 현재 기본 페이지 실행에는 환경변수가 필요하지 않습니다.

## 자동 검증

GitHub Actions는 `main` 브랜치 push와 pull request에서 의존성을 lockfile 기준으로 설치하고 lint, 타입, 서식, 프로덕션 빌드를 순서대로 검사합니다. Actions 화면에서 수동 실행할 수도 있습니다.

로컬과 CI 모두 `.nvmrc`의 Node 버전과 `package.json`의 pnpm 버전을 사용합니다.
