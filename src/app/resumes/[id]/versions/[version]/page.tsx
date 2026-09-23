import { notFound } from "next/navigation";
import { ResumeDetail } from "@/components/resumes/resume-detail";
export default async function VersionPage({
  params,
}: PageProps<"/resumes/[id]/versions/[version]">) {
  const { id, version } = await params;
  if (!/^[1-9]\d*$/.test(version) || !Number.isSafeInteger(Number(version)))
    notFound();
  return <ResumeDetail id={id} selectedVersion={Number(version)} />;
}
