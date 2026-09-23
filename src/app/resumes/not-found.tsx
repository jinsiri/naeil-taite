import Link from "next/link";
export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">이력서를 찾을 수 없어요</h1>
      <p>이력서 주소를 확인하거나 목록에서 다시 선택해 주세요.</p>
      <Link href="/resumes" className="text-primary underline">
        이력서 목록으로
      </Link>
    </div>
  );
}
