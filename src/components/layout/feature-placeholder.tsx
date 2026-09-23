import Link from "next/link";
import { Sprout } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FeaturePlaceholder({
  title,
  description,
  next,
}: {
  title: string;
  description: string;
  next: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-primary">
          나의 커리어 공간
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      <Card>
        <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <Sprout aria-hidden="true" className="mb-5 size-9 text-primary" />
          <span className="mb-3 rounded-full bg-secondary px-3 py-1 text-xs text-primary">
            준비 중
          </span>
          <h2 className="text-xl font-semibold">
            {title} 공간을 준비하고 있어요
          </h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            {next}
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              className: "mt-6 min-h-11 px-5",
            })}
          >
            대시보드로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
