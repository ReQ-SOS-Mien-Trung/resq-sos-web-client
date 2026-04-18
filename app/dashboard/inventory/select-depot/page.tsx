"use client";

import { Buildings, CheckCircle, SignOut } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLogout } from "@/services/auth/hooks";
import { useDepotStatuses } from "@/services/depot/hooks";
import { useManagerDepot } from "@/hooks/use-manager-depot";

const STATUS_TONE: Record<string, string> = {
  Available:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  Unavailable:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300",
  Closing:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
};

const FALLBACK_DEPOT_IMAGES = [
  "/images/cuuho.jpeg",
  "/images/IMG_1294.JPG",
  "/images/IMG_1297.JPG",
  "/images/IMG_1301.jpg",
];

export default function SelectDepotPage() {
  const router = useRouter();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { managedDepots, selectedDepotId, selectDepot } = useManagerDepot();
  const { data: depotStatuses = [] } = useDepotStatuses();

  const statusLabelMap = useMemo(
    () =>
      new Map<string, string>(
        depotStatuses.map((status) => [String(status.key), status.value]),
      ),
    [depotStatuses],
  );

  const uniqueManagedDepots = useMemo(() => {
    const deduped = new Map<string, (typeof managedDepots)[number]>();
    for (const depot of managedDepots) {
      const key = String(depot.depotId);
      if (!deduped.has(key)) {
        deduped.set(key, depot);
      }
    }
    return Array.from(deduped.values());
  }, [managedDepots]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),linear-gradient(180deg,#fffaf5_0%,#fff_52%,#fff7ed_100%)] px-4 py-6 sm:px-6"
    >
      <div className="flex min-h-[calc(100vh-3rem)] w-full flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="mb-6 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
              Multi-Depot Manager
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tighter text-slate-950 sm:text-4xl">
              Chọn kho để bắt đầu làm việc
            </h1>
            <p className="mt-2 max-w-2xl text-sm tracking-tight text-slate-600 sm:text-base">
              Vui lòng chọn kho để xem tồn kho, quỹ kho và thực hiện các nghiệp
              vụ liên quan.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-slate-200 px-3 text-sm shadow-sm"
            onClick={() => logout()}
            disabled={isLoggingOut}
          >
            <SignOut size={14} />
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </Button>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {uniqueManagedDepots.map((depot, index) => {
            const isSelected = selectedDepotId === depot.depotId;
            const imageSrc =
              depot.imageUrl?.trim() ||
              FALLBACK_DEPOT_IMAGES[index % FALLBACK_DEPOT_IMAGES.length];

            return (
              <motion.div
                key={depot.depotId}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.35,
                  delay: 0.16 + index * 0.06,
                  ease: "easeOut",
                }}
              >
                <Card
                  className={cn(
                    "group relative h-80 gap-0 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/95 py-0 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.32)] transition-all",
                    isSelected &&
                      "border-orange-300 shadow-[0_26px_70px_-35px_rgba(234,88,12,0.38)]",
                  )}
                >
                  <CardContent className="relative h-full p-0">
                    <Image
                      src={imageSrc}
                      alt={depot.depotName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.34)_48%,rgba(2,6,23,0.92)_100%)]" />

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 text-orange-600 backdrop-blur-sm">
                        <Buildings size={20} weight="duotone" />
                      </div>
                      <Badge
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm",
                          STATUS_TONE[depot.status] ??
                            "border-slate-200 bg-white/80 text-slate-700",
                        )}
                      >
                        {statusLabelMap.get(depot.status) ?? depot.status}
                      </Badge>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 grid grid-cols-[1fr_auto] items-end gap-3 p-4">
                      <div>
                        <p className="line-clamp-2 text-3xl leading-[1.08] font-bold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]">
                          {depot.depotName}
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm tracking-tight text-white/85">
                          {depot.address}
                        </p>
                      </div>

                      <Button
                        className={cn(
                          "h-9 gap-1.5 self-end tracking-tighter rounded-xl border border-white/70 bg-white px-4 text-sm font-semibold text-slate-900 shadow-md hover:bg-white/95",
                          isSelected &&
                            "border-orange-200 bg-orange-500 text-white hover:bg-orange-600",
                        )}
                        onClick={() => {
                          selectDepot(depot.depotId);
                          router.replace("/dashboard/inventory");
                        }}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle size={16} weight="fill" />
                            Tiếp tục
                          </>
                        ) : (
                          "Chọn kho"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.main>
  );
}
