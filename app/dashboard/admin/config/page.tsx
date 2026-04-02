"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  FadersIcon,
  WarningCircle,
  X,
  Plus,
  Info,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useSosPriorityRuleConfig,
  useUpdateSosPriorityRuleConfig,
} from "@/services/config";
import {
  SosPriorityRuleConfigEntity,
  UpdateSosPriorityRuleConfigRequest,
} from "@/services/config/type";
import { WarningBandConfigCard } from "@/components/admin/inventory/WarningBandConfigCard";
import { SupplyRequestPriorityConfigCard } from "@/components/admin/inventory/SupplyRequestPriorityConfigCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonFieldKey = keyof UpdateSosPriorityRuleConfigRequest;

type JsonFieldConfig = {
  key: JsonFieldKey;
  label: string;
  description: string;
  editorType?: "situation-multiplier" | "priority-thresholds";
};

const JSON_FIELDS: JsonFieldConfig[] = [
  { key: "issueWeightsJson", label: "Issue Weights", description: "Trọng số mức độ ưu tiên theo loại vấn đề" },
  { key: "medicalSevereIssuesJson", label: "Medical Severe Issues", description: "Danh sách điều kiện y tế nghiêm trọng" },
  { key: "ageWeightsJson", label: "Age Weights", description: "Trọng số theo nhóm tuổi" },
  { key: "requestTypeScoresJson", label: "Request Type Scores", description: "Điểm ưu tiên theo loại yêu cầu cứu trợ" },
  { key: "situationMultipliersJson", label: "Situation Multipliers", description: "Hệ số nhân theo ngữ cảnh/tình huống", editorType: "situation-multiplier" },
  { key: "priorityThresholdsJson", label: "Priority Thresholds", description: "Ngưỡng phân loại mức độ ưu tiên", editorType: "priority-thresholds" },
];

const emptyForm: UpdateSosPriorityRuleConfigRequest = {
  issueWeightsJson: "{}",
  medicalSevereIssuesJson: "[]",
  ageWeightsJson: "{}",
  requestTypeScoresJson: "{}",
  situationMultipliersJson: "{}",
  priorityThresholdsJson: "{}",
};

function mapEntityToForm(data: SosPriorityRuleConfigEntity): UpdateSosPriorityRuleConfigRequest {
  return {
    issueWeightsJson: data.issueWeightsJson,
    medicalSevereIssuesJson: data.medicalSevereIssuesJson,
    ageWeightsJson: data.ageWeightsJson,
    requestTypeScoresJson: data.requestTypeScoresJson,
    situationMultipliersJson: data.situationMultipliersJson,
    priorityThresholdsJson: data.priorityThresholdsJson,
  };
}

function detectFieldType(value: string): "numeric-object" | "string-array" | "unknown" {
  try {
    const parsed = JSON.parse(value || "{}");
    if (Array.isArray(parsed)) {
      if (parsed.length === 0 || parsed.every((v) => typeof v === "string")) return "string-array";
    } else if (parsed && typeof parsed === "object") {
      const vals = Object.values(parsed);
      if (vals.length === 0 || vals.every((v) => typeof v === "number")) return "numeric-object";
    }
  } catch { }
  return "unknown";
}

// ─── Smart Editors ────────────────────────────────────────────────────────────

function NumericObjectEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const entries = useMemo((): [string, number][] => {
    try {
      const obj = JSON.parse(value || "{}");
      if (obj && typeof obj === "object" && !Array.isArray(obj))
        return Object.entries(obj) as [string, number][];
    } catch { }
    return [];
  }, [value]);

  // undo stack
  const [history, setHistory] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const serialize = (ents: [string, number][]) => {
    setHistory((h) => [...h, value]);
    onChange(JSON.stringify(Object.fromEntries(ents)));
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      onChange(next.pop()!);
      return next;
    });
  };

  const updateVal = (key: string, val: number) =>
    serialize(entries.map(([k, v]) => (k === key ? [k, val] : [k, v])));

  const removeEntry = (key: string) =>
    serialize(entries.filter(([k]) => k !== key));

  const addEntry = () => {
    const k = newKey.trim();
    if (!k) return;
    const v = parseFloat(newVal) || 0;
    const exists = entries.some(([ek]) => ek === k);
    serialize(
      exists
        ? entries.map(([ek, ev]) => (ek === k ? [ek, v] : [ek, ev]))
        : [...entries, [k, v]],
    );
    setNewKey("");
    setNewVal("");
  };

  return (
    <div className="space-y-2">
      <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="group flex items-center gap-2">
            <span className="flex-1 min-w-0 truncate rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-mono text-sm font-semibold tracking-tight text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
              {key}
            </span>
            <input
              type="number"
              step="any"
              value={val}
              disabled={disabled}
              onChange={(e) => updateVal(key, parseFloat(e.target.value) || 0)}
              className="h-8 w-24 rounded-md border border-indigo-200 bg-indigo-50/50 px-2 text-center font-mono text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-200"
            />
            <button
              disabled={disabled}
              onClick={() => removeEntry(key)}
              className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* add new + undo */}
      <div className="flex items-center gap-2 border-t border-dashed border-border/50 pt-2">
        <input
          type="text"
          placeholder="key mới..."
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          className="h-8 flex-1 rounded-md border border-border/60 bg-background px-2.5 font-mono text-sm tracking-tighter outline-none focus:border-foreground/40"
        />
        <input
          type="number"
          step="any"
          placeholder="0"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          className="h-8 w-20 rounded-md border border-border/60 bg-background px-2 text-center font-mono text-sm outline-none focus:border-foreground/40"
        />
        <button
          onClick={addEntry}
          disabled={disabled || !newKey.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background disabled:opacity-30"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={undo}
          disabled={disabled || history.length === 0}
          title="Hoàn tác"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowCounterClockwise size={13} />
        </button>
      </div>
    </div>
  );
}

function StringArrayEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const tags = useMemo((): string[] => {
    try {
      const arr = JSON.parse(value || "[]");
      if (Array.isArray(arr)) return arr as string[];
    } catch { }
    return [];
  }, [value]);

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);

  const serialize = (t: string[]) => {
    setHistory((h) => [...h, value]);
    onChange(JSON.stringify(t));
  };
  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      onChange(next.pop()!);
      return next;
    });
  };
  const addTag = () => {
    const v = input.trim();
    if (!v || tags.includes(v)) { setInput(""); return; }
    serialize([...tags, v]);
    setInput("");
    inputRef.current?.focus();
  };
  const removeTag = (tag: string) => serialize(tags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex min-h-12 flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 tracking-tighter rounded-md bg-teal-100 px-2.5 py-1 text-sm font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-200"
          >
            {tag}
            <button
              disabled={disabled}
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-red-500"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="self-center px-1 text-xs text-muted-foreground">
            Chưa có mục nào
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nhập giá trị mới rồi nhấn Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          className="h-8 flex-1 rounded-md border border-border/60 bg-background px-2.5 text-sm tracking-tighter outline-none focus:border-foreground/40"
        />
        <button
          onClick={addTag}
          disabled={disabled || !input.trim()}
          className="flex h-8 items-center gap-1 rounded-md bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-30"
        >
          <Plus size={12} />
          Thêm
        </button>
        <button
          onClick={undo}
          disabled={disabled || history.length === 0}
          title="Hoàn tác"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowCounterClockwise size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Situation Multiplier Editor ─────────────────────────────────────────────

type SituationMultiplierItem = { keys: string[]; severe: boolean; multiplier: number };

function SituationMultiplierEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const items = useMemo((): SituationMultiplierItem[] => {
    try {
      const arr = JSON.parse(value || "[]");
      if (Array.isArray(arr)) return arr as SituationMultiplierItem[];
    } catch { }
    return [];
  }, [value]);

  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<string[]>([]);

  const serialize = (arr: SituationMultiplierItem[]) => {
    setHistory((h) => [...h, value]);
    onChange(JSON.stringify(arr));
  };
  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      onChange(next.pop()!);
      return next;
    });
  };
  const updateItem = (idx: number, patch: Partial<SituationMultiplierItem>) =>
    serialize(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const removeItem = (idx: number) => serialize(items.filter((_, i) => i !== idx));
  const addItem = () => serialize([...items, { keys: [], severe: false, multiplier: 1.0 }]);

  const addTag = (idx: number) => {
    const v = (tagInputs[idx] ?? "").trim();
    if (!v) return;
    if (!items[idx].keys.includes(v))
      updateItem(idx, { keys: [...items[idx].keys, v] });
    setTagInputs((prev) => ({ ...prev, [idx]: "" }));
  };
  const removeTag = (idx: number, ki: number) =>
    updateItem(idx, { keys: items[idx].keys.filter((_, i) => i !== ki) });

  return (
    <div className="space-y-2">
      <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="group rounded-md border border-border/50 bg-amber-50/60 p-2.5 space-y-2 border-l-2 border-l-amber-400 dark:bg-amber-950/20 dark:border-l-amber-600">
            {/* keyword tags */}
            <div className="flex flex-wrap items-center gap-1">
              {item.keys.map((k, ki) => (
                <span key={ki} className="inline-flex items-center gap-0.5 rounded-md bg-amber-200/80 px-2 py-1 font-mono text-sm font-semibold tracking-tight text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  {k}
                  <button disabled={disabled} onClick={() => removeTag(idx, ki)} className="hover:text-red-500 ml-0.5"><X size={12} /></button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ keyword"
                value={tagInputs[idx] ?? ""}
                onChange={(e) => setTagInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                disabled={disabled}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(idx); } }}
                className="h-7 w-24 rounded bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {/* controls */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={item.severe} disabled={disabled}
                  onChange={(e) => updateItem(idx, { severe: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-foreground" />
                <span className="text-sm text-muted-foreground font-mono">severe</span>
              </label>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground font-mono">×</span>
                <input type="number" step="0.1" value={item.multiplier} disabled={disabled}
                  onChange={(e) => updateItem(idx, { multiplier: parseFloat(e.target.value) || 1 })}
                  className="h-9 w-24 rounded-md border border-amber-300 bg-amber-50 px-2 text-center font-mono text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200" />
              </div>
              <button disabled={disabled} onClick={() => removeItem(idx)}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-dashed border-border/50 pt-2">
        <button onClick={addItem} disabled={disabled}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 py-1.5 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors disabled:opacity-40">
          <Plus size={12} /> Thêm tình huống
        </button>
        <button
          onClick={undo}
          disabled={disabled || history.length === 0}
          title="Hoàn tác"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowCounterClockwise size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Priority Thresholds Editor ───────────────────────────────────────────────

type PriorityThresholdValue = { minScore: number; requireSevere: boolean };

function PriorityThresholdsEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const entries = useMemo((): [string, PriorityThresholdValue][] => {
    try {
      const obj = JSON.parse(value || "{}");
      if (obj && typeof obj === "object" && !Array.isArray(obj))
        return Object.entries(obj) as [string, PriorityThresholdValue][];
    } catch { }
    return [];
  }, [value]);

  const [history, setHistory] = useState<string[]>([]);

  const serialize = (ents: [string, PriorityThresholdValue][]) => {
    setHistory((h) => [...h, value]);
    onChange(JSON.stringify(Object.fromEntries(ents)));
  };
  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      onChange(next.pop()!);
      return next;
    });
  };
  const updateEntry = (key: string, patch: Partial<PriorityThresholdValue>) =>
    serialize(entries.map(([k, v]) => (k === key ? [k, { ...v, ...patch }] : [k, v])));
  const removeEntry = (key: string) =>
    serialize(entries.filter(([k]) => k !== key));

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {entries.map(([key, val]) => {
          const chipColor =
            key === "critical" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              : key === "high" ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                : key === "medium" ? "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300"
                  : "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300";
          return (
            <div key={key} className="group flex items-center gap-2">
              <span className={`w-20 shrink-0 rounded-md border px-2.5 py-1.5 font-mono text-sm font-semibold tracking-tight ${chipColor}`}>
                {key}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono shrink-0">minScore</span>
                <input type="number" value={val.minScore} disabled={disabled}
                  onChange={(e) => updateEntry(key, { minScore: parseInt(e.target.value) || 0 })}
                  className="h-8 w-20 rounded-md border border-border/60 bg-background px-2 text-center font-mono text-sm" />
                <label className="ml-2 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={val.requireSevere} disabled={disabled}
                    onChange={(e) => updateEntry(key, { requireSevere: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">requireSevere</span>
                </label>
              </div>
              <button disabled={disabled} onClick={() => removeEntry(key)}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end border-t border-dashed border-border/50 pt-2">
        <button
          onClick={undo}
          disabled={disabled || history.length === 0}
          title="Hoàn tác"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowCounterClockwise size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminConfigPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<UpdateSosPriorityRuleConfigRequest>>({});

  const {
    data: configData,
    isLoading: configLoading,
    isFetching: configFetching,
    refetch,
  } = useSosPriorityRuleConfig();
  const updateMutation = useUpdateSosPriorityRuleConfig();

  useEffect(() => {
    getDashboardData()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, []);

  const configId = configData?.id ?? null;

  const serverForm = useMemo<UpdateSosPriorityRuleConfigRequest>(() => {
    if (!configData) return emptyForm;
    return mapEntityToForm(configData);
  }, [configData]);

  const getFieldValue = useCallback(
    (key: JsonFieldKey) => draft[key] ?? serverForm[key],
    [draft, serverForm],
  );

  const setFieldValue = useCallback(
    (key: JsonFieldKey, value: string) =>
      setDraft((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const handleSave = useCallback(() => {
    if (!configId) { toast.error("Không tìm thấy id cấu hình"); return; }

    const payload = {} as UpdateSosPriorityRuleConfigRequest;
    for (const field of JSON_FIELDS) {
      try {
        payload[field.key] = JSON.stringify(JSON.parse(getFieldValue(field.key)));
      } catch {
        toast.error(`Dữ liệu không hợp lệ ở mục: ${field.label}`);
        return;
      }
    }

    const toastId = toast.loading("Đang cập nhật cấu hình...");
    updateMutation.mutate(
      { id: configId, data: payload },
      {
        onSuccess: async () => {
          toast.dismiss(toastId);
          toast.success("Cập nhật cấu hình thành công");
          setDraft({});
          await refetch();
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error("Không thể cập nhật cấu hình");
        },
      },
    );
  }, [configId, getFieldValue, refetch, updateMutation]);

  if (dashboardLoading || !dashboardData) {
    return (
      <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
        <DashboardSkeleton variant="editor" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col xl:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <FadersIcon size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Cấu hình hệ thống
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Tham số hệ thống
            </h1>
          </div>
        </div>

        <Tabs defaultValue="sos-priority">
          <TabsList className="rounded-none border-b border-border/60 bg-transparent p-0 h-auto w-full justify-start gap-0">
            <TabsTrigger
              value="sos-priority"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm tracking-tighter font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Ưu tiên SOS
            </TabsTrigger>
            <TabsTrigger
              value="warning-band"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm tracking-tighter font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1.5"
            >
              <WarningCircle size={14} className="text-amber-500" />
              Dải cảnh báo kho
            </TabsTrigger>
            <TabsTrigger
              value="supply-priority"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm tracking-tighter font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1.5"
            >
              <Info size={14} className="text-sky-500" />
              Thời gian tiếp tế
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: SOS Priority ── */}
          <TabsContent value="sos-priority" className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm tracking-tighter text-muted-foreground">
                Chỉnh trực tiếp từng tham số bên dưới. Nhấn <strong className="text-primary">Lưu cấu hình</strong> để áp dụng.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDraft({}); refetch(); }}
                  disabled={configLoading || configFetching}
                >
                  <ArrowCounterClockwise size={14} className={`mr-1.5 ${configFetching ? "animate-spin" : ""}`} />
                  Làm mới
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || configLoading}>
                  <FloppyDisk size={14} className="mr-1.5" />
                  Lưu cấu hình
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {JSON_FIELDS.map((field) => {
                const currentValue = getFieldValue(field.key);
                const autoType = detectFieldType(currentValue);
                const cardAccent =
                  field.editorType === "situation-multiplier" ? "border-l-4 border-l-amber-400"
                    : field.editorType === "priority-thresholds" ? "border-l-4 border-l-rose-400"
                      : autoType === "string-array" ? "border-l-4 border-l-teal-400"
                        : "border-l-4 border-l-indigo-400";
                return (
                  <Card key={field.key} className={`border-border/60 ${cardAccent}`}>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-base tracking-tighter">{field.label}</CardTitle>
                      <CardDescription className="tracking-tighter text-sm">{field.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {field.editorType === "situation-multiplier" && (
                        <SituationMultiplierEditor
                          value={currentValue}
                          onChange={(v) => setFieldValue(field.key, v)}
                          disabled={configLoading}
                        />
                      )}
                      {field.editorType === "priority-thresholds" && (
                        <PriorityThresholdsEditor
                          value={currentValue}
                          onChange={(v) => setFieldValue(field.key, v)}
                          disabled={configLoading}
                        />
                      )}
                      {!field.editorType && autoType === "numeric-object" && (
                        <NumericObjectEditor
                          value={currentValue}
                          onChange={(v) => setFieldValue(field.key, v)}
                          disabled={configLoading}
                        />
                      )}
                      {!field.editorType && autoType === "string-array" && (
                        <StringArrayEditor
                          value={currentValue}
                          onChange={(v) => setFieldValue(field.key, v)}
                          disabled={configLoading}
                        />
                      )}
                      {!field.editorType && autoType === "unknown" && (
                        <textarea
                          value={currentValue}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                          disabled={configLoading}
                          rows={8}
                          className="w-full resize-y rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-sm tracking-tighter leading-relaxed outline-none focus:border-foreground/40"
                          placeholder={`{\n  "key": "value"\n}`}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab: Warning Band ── */}
          <TabsContent value="warning-band" className="mt-5 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold tracking-tighter text-amber-700 dark:text-amber-300">
                  Lưu ý khi chỉnh dải cảnh báo
                </p>
                <p className="text-xs tracking-tighter text-amber-700/90 dark:text-amber-200/80">
                  Thay đổi cấu hình này sẽ ảnh hưởng đến toàn bộ hệ thống kho.
                  Các mức CRITICAL, MEDIUM, LOW, OK phải tăng dần và không được chồng lấn nhau.
                  Cài đặt có hiệu lực ngay sau khi lưu.
                </p>
              </div>
            </div>
            <WarningBandConfigCard />
          </TabsContent>

          {/* ── Tab: Supply Request Priority ── */}
          <TabsContent value="supply-priority" className="mt-5 space-y-4">
            <SupplyRequestPriorityConfigCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminConfigPage;
