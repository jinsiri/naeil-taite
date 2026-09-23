import { ResumeDetail } from "@/components/resumes/resume-detail";
export default async function ResumePage({
  params,
}: PageProps<"/resumes/[id]">) {
  return <ResumeDetail id={(await params).id} />;
}
