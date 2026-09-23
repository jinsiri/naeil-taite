import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/auth/account-menu";
import { ArrowUpRight, Fingerprint, Sprout } from "lucide-react";
import { Navigation } from "@/components/layout/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
      >
        본문으로 바로가기
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-2 px-4 sm:px-8">
          <Link
            href="/"
            aria-label="내일나이테 홈"
            className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Fingerprint
              aria-hidden="true"
              className="hidden size-9 text-primary min-[380px]:block"
            />
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              내일나이테
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground lg:inline">
                내 일의 내일을 위해
              </span>
            </span>
          </Link>
          <Suspense
            fallback={
              <span className="text-xs text-muted-foreground">
                계정 확인 중…
              </span>
            }
          >
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <aside className="border-b bg-card lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-6">
          <p className="mb-4 hidden px-4 text-xs font-medium tracking-wider text-muted-foreground lg:block">
            WORKSPACE
          </p>
          <Navigation />
          <div className="mt-12 hidden rounded-xl border bg-background p-4 lg:block">
            <Sprout aria-hidden="true" className="mb-3 size-5 text-primary" />
            <p className="text-sm font-medium">경험이 쌓여, 다음 기회로</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              나의 경험부터 지원의 마지막 순간까지 차근차근 기록해 보세요.
            </p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-5 py-8 outline-none sm:px-8 lg:px-12 lg:py-10"
          >
            {children}
          </main>
          <footer className="mx-5 flex flex-col gap-2 border-t py-5 text-xs text-muted-foreground sm:mx-8 sm:flex-row sm:items-center sm:justify-between lg:mx-12">
            <p>내일나이테 · 내 일의 내일을 위해</p>
            <Link
              href="/"
              className="inline-flex min-h-8 items-center gap-1 self-start rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              나의 커리어 모아보기
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}
