import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  GitCompareArrows,
  PanelsTopLeft,
  Sprout,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    href: "/resumes",
    title: "나의 경험 정리하기",
    description: "이력서와 여러 버전을 한곳에서 관리해요.",
    icon: FileText,
    label: "이력서 둘러보기",
  },
  {
    href: "/jobs",
    title: "다음 기회 모아보기",
    description: "관심 있는 공고와 마감일을 함께 보관해요.",
    icon: BriefcaseBusiness,
    label: "채용공고 둘러보기",
  },
  {
    href: "/analysis",
    title: "근거로 연결하기",
    description: "공고와 이력서의 일치점과 부족한 정보를 살펴봐요.",
    icon: GitCompareArrows,
    label: "매칭 분석 둘러보기",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-9">
      <div>
        <p className="mb-3 text-sm font-medium text-primary">
          나의 커리어, 차곡차곡
        </p>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          쌓아온 경험을 돌아보고, 다음 기회를 준비하는 공간이에요.
        </p>
      </div>
      <section
        aria-labelledby="welcome-title"
        className="relative overflow-hidden rounded-2xl border bg-secondary p-7 sm:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-40 size-96 rounded-full border-[32px] border-primary/5 sm:right-0"
        >
          <div className="absolute inset-8 rounded-full border-[24px] border-primary/5">
            <div className="absolute inset-7 rounded-full border-[18px] border-primary/5" />
          </div>
        </div>
        <div className="relative max-w-xl">
          <span className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sprout className="size-4" aria-hidden="true" />
            새로운 시작, 첫 번째 나이테
          </span>
          <h2
            id="welcome-title"
            className="text-2xl leading-snug font-semibold tracking-tight sm:text-3xl"
          >
            오늘의 경험이
            <br />
            내일의 기회가 되도록.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            이력서부터 관심 공고, 지원 기록까지.
            <br className="hidden sm:block" /> 흩어져 있던 취업 준비를 한곳에
            모아보세요.
          </p>
          <Link
            href="/resumes"
            className={buttonVariants({
              className: "mt-6 min-h-11 gap-2 px-5",
            })}
          >
            이력서 공간 둘러보기
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section aria-labelledby="start-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 id="start-title" className="text-lg font-semibold">
            이렇게 시작해 보세요
          </h2>
          <span className="text-xs text-muted-foreground">
            경험 정리부터 지원 준비까지
          </span>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {steps.map(
            ({ href, title, description, icon: Icon, label }, index) => (
              <Card key={href} className="py-6">
                <CardContent className="flex h-full flex-col px-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      STEP 0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 mb-5 flex-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center justify-between gap-2 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {label}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      </section>
      <section
        aria-labelledby="application-title"
        className="flex flex-col gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <PanelsTopLeft
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-primary"
          />
          <div>
            <h2 id="application-title" className="font-semibold">
              지원의 모든 과정을 한눈에
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              관심 공고부터 전형 결과까지, 다음 할 일을 놓치지 않도록.
            </p>
          </div>
        </div>
        <Link
          href="/applications"
          className={buttonVariants({
            variant: "outline",
            className: "min-h-11 px-4",
          })}
        >
          지원 현황 둘러보기
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
