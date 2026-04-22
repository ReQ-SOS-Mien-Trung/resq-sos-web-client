"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "@phosphor-icons/react";
import { useDepotById, useDepotStatuses } from "@/services/depot/hooks";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { DepotClosurePanel } from "@/components/inventory/DepotClosurePanel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Page wrapper ──────────────────────────────────────────────── */
export default function DepotClosurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDepotId } = useManagerDepot();
  const depotId = selectedDepotId ?? 0;
  const { data: depot, isLoading: depotLoading } = useDepotById(depotId);
  const { data: statusMetadata } = useDepotStatuses();

  const routeClosureId = (() => {
    const v = searchParams.get("closureId");
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  })();
  const routeTransferId = (() => {
    const v = searchParams.get("transferId");
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  })();

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* ══ Header ══ */}
      <header className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl tracking-tighter font-bold leading-tight mb-1">
                Đóng kho &amp; Chuyển hàng
              </h1>
              <div className="flex items-center gap-2 text-base tracking-tighter font-medium text-muted-foreground">
                <span>{depot?.name ?? `Kho #${depotId}`}</span>
                {depot?.status && (
                  <Badge
                    className={cn(
                      "text-[13px] font-semibold tracking-tighter shrink-0",
                      depot.status === "Closing"
                        ? "bg-red-500/10 text-red-700 dark:text-red-400"
                        : depot.status === "Closed"
                          ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    {statusMetadata?.find((s) => s.key === depot.status)
                      ?.value ?? depot.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ Main ══ */}
      <main className="px-6 py-6 flex-1">
        {depotLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <DepotClosurePanel
            closureId={routeClosureId}
            transferId={routeTransferId}
          />
        )}
      </main>
    </div>
  );
}
