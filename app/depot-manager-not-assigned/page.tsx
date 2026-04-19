"use client";

import Link from "next/link";
import {
  ArrowClockwise,
  Buildings,
  House,
  ShieldCheck,
  SignOut,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";

export default function DepotManagerNotAssignedPage() {
  const user = useAuthStore((state) => state.user);
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_24%),linear-gradient(180deg,_#fffaf5_0%,_#fff_52%,_#fff7ed_100%)] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[32px] border border-orange-200/80 bg-white/95 shadow-[0_28px_80px_-40px_rgba(234,88,12,0.38)] backdrop-blur">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[linear-gradient(180deg,_rgba(255,247,237,0.96),_rgba(255,251,235,0.92))] lg:block" />

          <div className="relative grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-orange-100 p-6 sm:p-7 lg:border-b-0 lg:border-r lg:border-orange-100 lg:p-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[13px] font-semibold tracking-tighter text-orange-700 shadow-sm">
                <WarningCircle size={16} weight="fill" />
                Chưa có kho phụ trách
              </div>

              <div className="mt-5 max-w-3xl space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter text-slate-950 sm:text-4xl lg:text-[2.6rem] lg:leading-tight">
                  Bạn hiện chưa được phân công kho
                </h1>
                <p className="max-w-xl text-base tracking-tighter leading-relaxed text-slate-600">
                  Tài khoản của bạn vẫn hoạt động bình thường, nhưng hiện chưa
                  có kho nào được gán để quản lý.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_-30px_rgba(15,23,42,0.35)]">
                  <p className="text-[13px] font-medium tracking-tighter text-slate-500">
                    Tài khoản hiện tại
                  </p>
                  <p className="mt-1 text-base font-bold tracking-tighter text-slate-950">
                    {user?.fullName ?? "Quản lý kho"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_-30px_rgba(15,23,42,0.35)]">
                  <p className="text-[13px] font-medium tracking-tighter text-slate-500">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-base font-bold tracking-tighter text-slate-950">
                    Chưa có kho
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="h-10 gap-2 shrink-0 rounded-[14px] bg-orange-600 px-5 text-[15px] font-semibold tracking-tighter text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.7)] hover:bg-orange-700"
                >
                  {isLoggingOut ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Đang đăng xuất...
                    </>
                  ) : (
                    <>
                      <SignOut size={16} />
                      Đăng xuất
                    </>
                  )}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 gap-2 shrink-0 rounded-[14px] border-slate-200 px-5 text-[15px] font-semibold tracking-tighter text-slate-700"
                >
                  <Link href="/">
                    <House size={16} />
                    Về trang chủ
                  </Link>
                </Button>
              </div>
            </div>

            <div className="p-6 sm:p-7 lg:p-8">
              <div className="rounded-[28px] border border-orange-200/80 bg-white/90 p-5 shadow-[0_20px_50px_-30px_rgba(234,88,12,0.3)] sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-orange-100 text-orange-700 shadow-sm">
                  <Buildings size={22} weight="duotone" />
                </div>

                <h2 className="mt-4 text-lg font-bold tracking-tighter text-slate-950">
                  Bước tiếp theo
                </h2>

                <div className="mt-4 space-y-2.5">
                  <div className="flex items-start gap-3 rounded-[20px] bg-orange-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                      <SignOut size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tighter text-slate-900">
                        1. Đăng xuất khỏi tài khoản này
                      </p>
                      <p className="mt-0.5 text-[13px] tracking-tighter leading-snug text-slate-600">
                        Kết thúc phiên làm việc hiện tại.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[20px] bg-amber-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                      <ArrowClockwise size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tighter text-slate-900">
                        2. Đăng nhập lại khi đã có kho mới
                      </p>
                      <p className="mt-0.5 text-[13px] tracking-tighter leading-snug text-slate-600">
                        Bạn sẽ dùng lại hệ thống như bình thường.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[20px] bg-slate-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                      <House size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tighter text-slate-900">
                        3. Báo quản trị viên nếu có nhầm lẫn
                      </p>
                      <p className="mt-0.5 text-[13px] tracking-tighter leading-snug text-slate-600">
                        Khi bạn nghĩ mình vẫn phải quản lý kho này.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/80 p-3.5 text-[13px] tracking-tighter leading-relaxed text-orange-900 font-medium">
                  Chỉ cần đăng xuất và quay lại sau khi được cập nhật kho phụ
                  trách.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
