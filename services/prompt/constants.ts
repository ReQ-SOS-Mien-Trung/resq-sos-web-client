import type { PromptType } from "./type";

export const PROMPT_TYPE_LABELS = {
  SosPriorityAnalysis: "Phân tích SOS",
  MissionPlanning: "Mission planning",
  MissionRequirementsAssessment: "Đánh giá yêu cầu mission",
  MissionDepotPlanning: "Lập kế hoạch kho",
  MissionTeamPlanning: "Lập kế hoạch đội",
  MissionPlanValidation: "Kiểm tra kế hoạch mission",
} satisfies Record<PromptType, string>;
