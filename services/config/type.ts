export type SosExpressionNode =
  | { var: string }
  | { value: number }
  | {
      op: "ADD" | "SUB" | "MUL" | "DIV" | "MIN" | "MAX" | "ROUND" | "CEIL" | "FLOOR" | string;
      left?: SosExpressionNode;
      right?: SosExpressionNode;
      value?: SosExpressionNode;
    };

export interface SosPriorityScoreConfig {
  formula: string;
  use_request_type_score: boolean;
  expression: SosExpressionNode;
}

export interface SosMedicalScoreConfig {
  formula: string;
  age_weights: Record<string, number>;
  medical_issue_severity: Record<string, number>;
}

export interface SosBlanketUrgencyScoreConfig {
  apply_only_when_supply_selected: boolean;
  apply_only_when_are_blankets_enough_is_false: boolean;
  none_or_not_selected_score: number;
  requested_count_equals_1_score: number;
  requested_count_more_than_half_people_score: number;
  requested_count_between_2_and_half_people_score: number;
  half_people_operator: string;
}

export interface SosClothingUrgencyScoreConfig {
  apply_only_when_supply_selected: boolean;
  none_or_not_selected_score: number;
  needed_people_equals_1_score: number;
  needed_people_more_than_half_people_score: number;
  needed_people_between_2_and_half_people_score: number;
  half_people_operator: string;
}

export interface SosVulnerabilityRawConfig {
  CHILD_PER_PERSON: number;
  ELDERLY_PER_PERSON: number;
  HAS_PREGNANT_ANY: number;
}

export interface SosVulnerabilityScoreConfig {
  formula: string;
  expression: SosExpressionNode;
  vulnerability_raw: SosVulnerabilityRawConfig;
  cap_ratio: number;
}

export interface SosReliefScoreConfig {
  formula: string;
  expression: SosExpressionNode;
  supply_urgency_score: {
    formula: string;
    water_urgency_score: Record<string, number>;
    food_urgency_score: Record<string, number>;
    blanket_urgency_score: SosBlanketUrgencyScoreConfig;
    clothing_urgency_score: SosClothingUrgencyScoreConfig;
  };
  vulnerability_score: SosVulnerabilityScoreConfig;
}

export interface SosPriorityLevelConfig {
  P1_THRESHOLD: number;
  P2_THRESHOLD: number;
  P3_THRESHOLD: number;
  rule: string;
}

export interface SosUiConstraintsConfig {
  MIN_TOTAL_PEOPLE_TO_PROCEED: number;
  BLANKET_REQUEST_COUNT_DEFAULT: number;
  BLANKET_REQUEST_COUNT_MIN: number;
  BLANKET_REQUEST_COUNT_MAX_FORMULA: string;
}

export interface SosUiOptionsConfig {
  WATER_DURATION: string[];
  FOOD_DURATION: string[];
}

export interface SosDisplayLabelsConfig {
  medical_issues: Record<string, string>;
  situations: Record<string, string>;
  water_duration: Record<string, string>;
  food_duration: Record<string, string>;
  age_groups: Record<string, string>;
  request_types: Record<string, string>;
}

export interface SosPriorityRuleConfigDocument {
  config_version: string;
  is_active: boolean;
  medical_severe_issues: string[];
  request_type_scores: Record<string, number>;
  priority_score: SosPriorityScoreConfig;
  medical_score: SosMedicalScoreConfig;
  relief_score: SosReliefScoreConfig;
  situation_multiplier: Record<string, number>;
  priority_level: SosPriorityLevelConfig;
  ui_constraints: SosUiConstraintsConfig;
  ui_options: SosUiOptionsConfig;
  display_labels: SosDisplayLabelsConfig;
}

export interface SosPriorityRuleConfigEntity extends SosPriorityRuleConfigDocument {
  id: number;
  status: "Active" | "Draft" | "Archived" | string;
  created_at: string;
  created_by?: string | null;
  activated_at?: string | null;
  activated_by?: string | null;
  updated_at: string;
}

export interface SosPriorityRuleConfigVersionSummary {
  id: number;
  config_version: string;
  is_active: boolean;
  status: "Active" | "Draft" | "Archived" | string;
  created_at: string;
  created_by?: string | null;
  activated_at?: string | null;
  activated_by?: string | null;
  updated_at: string;
}

export interface ValidateSosPriorityRuleConfigRequest
  extends SosPriorityRuleConfigDocument {
  sos_request_id?: number | null;
}

export interface SosPriorityRuleConfigValidationPreview {
  sos_request_id: number;
  config_version: string;
  priority_score: number;
  priority_level: string;
  breakdown?: Record<string, unknown> | null;
}

export interface SosPriorityRuleConfigValidationResponse {
  is_valid: boolean;
  errors: string[];
  preview?: SosPriorityRuleConfigValidationPreview | null;
}

export type UpdateSosPriorityRuleConfigRequest = SosPriorityRuleConfigDocument;

export interface RescuerScoreVisibilityConfigEntity {
  minimumEvaluationCount: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UpdateRescuerScoreVisibilityConfigRequest {
  minimumEvaluationCount: number;
}

export interface SosClusterGroupingConfigEntity {
  maximumDistanceKm: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface UpdateSosClusterGroupingConfigRequest {
  maximumDistanceKm: number;
}

export interface RescueTeamRadiusConfigEntity {
  maxRadiusKm: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
  isDefaultValue?: boolean;
}

export interface UpdateRescueTeamRadiusConfigRequest {
  maxRadiusKm: number;
}
