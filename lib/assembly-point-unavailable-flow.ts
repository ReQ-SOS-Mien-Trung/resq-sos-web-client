import type { AssemblyPointUnavailableImpactResponse } from "@/services/assembly_points/type";

export const ASSEMBLY_POINT_UNAVAILABLE_DRAFT_STORAGE_KEY =
  "resq:assembly-point-unavailable-draft";

export interface AssemblyPointUnavailableDraft {
  assemblyPointId: number;
  reason: string;
  impact: AssemblyPointUnavailableImpactResponse | null;
  savedAt: string;
}

export function saveAssemblyPointUnavailableDraft(
  draft: AssemblyPointUnavailableDraft,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    ASSEMBLY_POINT_UNAVAILABLE_DRAFT_STORAGE_KEY,
    JSON.stringify(draft),
  );
}

export function readAssemblyPointUnavailableDraft(
  assemblyPointId: number,
): AssemblyPointUnavailableDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      ASSEMBLY_POINT_UNAVAILABLE_DRAFT_STORAGE_KEY,
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AssemblyPointUnavailableDraft>;
    if (
      parsed.assemblyPointId !== assemblyPointId ||
      typeof parsed.reason !== "string"
    ) {
      return null;
    }

    return parsed as AssemblyPointUnavailableDraft;
  } catch {
    return null;
  }
}

export function clearAssemblyPointUnavailableDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(
    ASSEMBLY_POINT_UNAVAILABLE_DRAFT_STORAGE_KEY,
  );
}
