import { ResumeEditor } from "@/components/resumes/resume-editor";
import { requireIdentity } from "@/lib/resumes/data";

export default async function NewResumePage() {
  await requireIdentity();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">이력서 등록하기</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          직접 입력한 내용으로 첫 번째 버전을 만들어요.
        </p>
      </div>
      <ResumeEditor />
    </div>
  );
}
