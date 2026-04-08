"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import CoordinatorSOSForm from "@/components/coordinator/CoordinatorSOSForm";
import { Button } from "@/components/ui/button";

function CreateSOSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="min-h-screen bg-white text-black tracking-tighter">
      <header className="sticky top-0 z-50 border-b-2 border-black bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/coordinator")}
            className="rounded-none border-black"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF5722]">
              Coordinator Editorial Desk
            </p>
            <h1 className="text-xl font-black uppercase tracking-tight">
              Tạo yêu cầu SOS
            </h1>
            <p className="text-xs text-black/65">
              Giao diện nhập nhanh dành cho điều phối viên
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 pb-24">
        <CoordinatorSOSForm
          mode="page"
          initialCoordinates={{
            lat: searchParams.get("lat"),
            lng: searchParams.get("lng"),
          }}
          onCancel={() => router.push("/dashboard/coordinator")}
          onSuccess={() => router.push("/dashboard/coordinator")}
        />
      </div>
    </div>
  );
}

export default function CreateSOSPage() {
  return (
    <Suspense>
      <CreateSOSContent />
    </Suspense>
  );
}
