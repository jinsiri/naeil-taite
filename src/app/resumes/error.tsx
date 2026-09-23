"use client";
import { Button } from "@/components/ui/button";
export default function ResumeError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <h1 className="text-xl font-semibold">이력서를 불러오지 못했어요</h1>
      <p className="text-sm text-muted-foreground">
        연결 상태를 확인한 뒤 다시 시도해 주세요.
      </p>
      <Button onClick={reset} className="min-h-11">
        다시 불러오기
      </Button>
    </div>
  );
}
