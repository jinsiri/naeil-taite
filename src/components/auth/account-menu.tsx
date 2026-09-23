import Link from "next/link";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getIdentity } from "@/lib/supabase/server";
import { getDisplayNickname } from "@/lib/auth/nickname";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";

export async function AccountMenu() {
  const identity = getSupabaseConfig() ? await getIdentity() : null;
  if (!identity)
    return (
      <Link
        href="/login"
        className={buttonVariants({
          variant: "outline",
          className: "min-h-11 shrink-0 px-4",
        })}
      >
        로그인
      </Link>
    );
  const nickname = getDisplayNickname(
    identity.user.id,
    identity.user.user_metadata,
  );
  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      <span
        title={nickname}
        className="max-w-24 truncate text-xs font-medium text-primary sm:max-w-48 sm:text-sm"
      >
        {nickname}
      </span>
      <SignOutButton />
    </div>
  );
}
