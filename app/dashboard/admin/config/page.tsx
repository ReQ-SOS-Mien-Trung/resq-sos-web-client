"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  FadersIcon,
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

type JsonFieldKey = keyof UpdateSosPriorityRuleConfigRequest;

type JsonFieldConfig = {
  key: JsonFieldKey;
  label: string;
  description: string;
};

const JSON_FIELDS: JsonFieldConfig[] = [
  {
    key: "issueWeightsJson",
    label: "Issue Weights",
    description: "Trọng số mức độ ưu tiên theo loại vấn đề",
  },
  {
    key: "medicalSevereIssuesJson",
    label: "Medical Severe Issues",
    description: "Danh sách điều kiện y tế nghiêm trọng",
  },
  {
    key: "ageWeightsJson",
    label: "Age Weights",
    description: "Trọng số theo nhóm tuổi",
  },
  {
    key: "requestTypeScoresJson",
    label: "Request Type Scores",
    description: "Điểm ưu tiên theo loại yêu cầu cứu trợ",
  },
  {
    key: "situationMultipliersJson",
    label: "Situation Multipliers",
    description: "Hệ số nhân theo ngữ cảnh/tình huống",
  },
  {
    key: "priorityThresholdsJson",
    label: "Priority Thresholds",
    description: "Ngưỡng phân loại mức độ ưu tiên",
  },
];

const emptyForm: UpdateSosPriorityRuleConfigRequest = {
  issueWeightsJson: "",
  medicalSevereIssuesJson: "",
  ageWeightsJson: "",
  requestTypeScoresJson: "",
  situationMultipliersJson: "",
  priorityThresholdsJson: "",
};

function formatJsonText(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function mapEntityToForm(
  data: SosPriorityRuleConfigEntity,
): UpdateSosPriorityRuleConfigRequest {
  return {
    issueWeightsJson: formatJsonText(data.issueWeightsJson),
    medicalSevereIssuesJson: formatJsonText(data.medicalSevereIssuesJson),
    ageWeightsJson: formatJsonText(data.ageWeightsJson),
    requestTypeScoresJson: formatJsonText(data.requestTypeScoresJson),
    situationMultipliersJson: formatJsonText(data.situationMultipliersJson),
    priorityThresholdsJson: formatJsonText(data.priorityThresholdsJson),
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminConfigPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [draft, setDraft] = useState<
    Partial<UpdateSosPriorityRuleConfigRequest>
  >({});

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

  const validationMap = useMemo(() => {
    const result: Record<JsonFieldKey, boolean> = {
      issueWeightsJson: true,
      medicalSevereIssuesJson: true,
      ageWeightsJson: true,
      requestTypeScoresJson: true,
      situationMultipliersJson: true,
      priorityThresholdsJson: true,
    };

    for (const field of JSON_FIELDS) {
      try {
        JSON.parse(getFieldValue(field.key));
        result[field.key] = true;
      } catch {
        result[field.key] = false;
      }
    }

    return result;
  }, [getFieldValue]);

  const handleFormatField = useCallback((key: JsonFieldKey) => {
    setDraft((prev) => ({
      ...prev,
      [key]: formatJsonText(getFieldValue(key)),
    }));
  }, [getFieldValue]);

  const handleSave = useCallback(() => {
    if (!configId) {
      toast.error("Không tìm thấy id cấu hình");
      return;
    }

    const firstInvalid = JSON_FIELDS.find((f) => !validationMap[f.key]);
    if (firstInvalid) {
      toast.error(`JSON không hợp lệ ở mục: ${firstInvalid.label}`);
      return;
    }

    const payload: UpdateSosPriorityRuleConfigRequest = {
      issueWeightsJson: JSON.stringify(JSON.parse(getFieldValue("issueWeightsJson"))),
      medicalSevereIssuesJson: JSON.stringify(
        JSON.parse(getFieldValue("medicalSevereIssuesJson")),
      ),
      ageWeightsJson: JSON.stringify(JSON.parse(getFieldValue("ageWeightsJson"))),
      requestTypeScoresJson: JSON.stringify(
        JSON.parse(getFieldValue("requestTypeScoresJson")),
      ),
      situationMultipliersJson: JSON.stringify(
        JSON.parse(getFieldValue("situationMultipliersJson")),
      ),
      priorityThresholdsJson: JSON.stringify(
        JSON.parse(getFieldValue("priorityThresholdsJson")),
      ),
    };

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
  }, [configId, getFieldValue, refetch, updateMutation, validationMap]);

  if (dashboardLoading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
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

            <div className="flex flex-col xl:flex-row items-start gap-4">
              <Card className="border-red-200/80 bg-red-50 dark:bg-red-950/20 py-2 w-full md:max-w-sm xl:max-w-md">
                <CardHeader className="px-3 py-3">
                  <CardTitle className="text-[15px] tracking-tighter text-red-700 dark:text-red-300">
                    Lưu ý dữ liệu
                  </CardTitle>
                  <CardDescription className="tracking-tighter text-[14px] text-red-700/90 dark:text-red-200/90">
                    Các trường dưới đây được lưu dưới dạng JSONB. Vui lòng nhập
                    JSON hợp lệ (object hoặc array) trước khi lưu.
                  </CardDescription>
                </CardHeader>
              </Card>
              <div className="flex items-center gap-2 xl:ml-auto xl:self-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft({});
                    refetch();
                  }}
                  disabled={configLoading || configFetching}
                >
                  <ArrowCounterClockwise
                    size={14}
                    className={`mr-1.5 ${configFetching ? "animate-spin" : ""}`}
                  />
                  Làm mới
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || configLoading}
                >
                  <FloppyDisk size={14} className="mr-1.5" />
                  Lưu cấu hình
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {JSON_FIELDS.map((field) => {
                const isValid = validationMap[field.key];
                return (
                  <Card key={field.key} className="border-border/60">
                    <CardHeader className="">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-[16px] tracking-tighter">
                            {field.label}
                          </CardTitle>
                          <CardDescription className="tracking-tighter text-[14px]">
                            {field.description}
                          </CardDescription>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-sm"
                          onClick={() => handleFormatField(field.key)}
                        >
                          Format
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <Label className="text-sm tracking-tighter">
                        Nội dung Json
                      </Label>
                      <Textarea
                        value={getFieldValue(field.key)}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="min-h-60 resize-y font-regular text-[14px] tracking-tighter leading-relaxed"
                        placeholder={`{\n  "key": "value"\n}`}
                      />
                      <p
                        className={`text-xs tracking-tighter ${
                          isValid ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isValid ? "JSON hợp lệ" : "JSON không hợp lệ"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminConfigPage;
