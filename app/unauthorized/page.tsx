"use client";

import { useRouter } from "next/navigation";
import { ShieldSlash, SignOut, House } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/services/auth/hooks";

export default function UnauthorizedPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { mutate: logout, isPending } = useLogout();

  const handleGoHome = () => {
    router.push("/");
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-6 rounded-full bg-destructive/10 animate-pulse">
            <ShieldSlash
              size={64}
              weight="duotone"
              className="text-destructive"
            />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Không có quyền truy cập
          </h1>
          <p className="text-muted-foreground">
            Bạn không có quyền truy cập vào trang này.
            {user && (
              <span className="block mt-2 text-sm">
                Tài khoản của bạn:{" "}
                <strong className="text-foreground">{user.fullName}</strong>
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleGoHome} className="gap-2">
            <House size={18} />
            Về trang chủ
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Đang đăng xuất...
              </>
            ) : (
              <>
                <SignOut size={18} />
                Đăng xuất
              </>
            )}
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          Nếu bạn tin rằng đây là lỗi, vui lòng liên hệ quản trị viên.
        </p>
      </div>
    </div>
  );
}
