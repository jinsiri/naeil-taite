import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">나만의 이력서 공간</h1>
      <p className="text-sm text-muted-foreground">
        로그인해서 이력서와 버전 기록을 안전하게 보관하세요.
      </p>
      <Card>
        <CardContent>
          {getSupabaseConfig() ? (
            <LoginForm />
          ) : (
            <p role="status" className="py-6 leading-7">
              서비스 연결을 준비하고 있어요. 연결이 완료되면 로그인하고 이력서를
              등록할 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
