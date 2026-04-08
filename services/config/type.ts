// SOS Priority Rule Config Entity
export interface SosPriorityRuleConfigEntity {
  id: number;
  issueWeightsJson: string;
  medicalSevereIssuesJson: string;
  ageWeightsJson: string;
  requestTypeScoresJson: string;
  situationMultipliersJson: string;
  priorityThresholdsJson: string;
  updatedAt: string;
}

// Update SOS Priority Rule Config Request
export interface UpdateSosPriorityRuleConfigRequest {
  issueWeightsJson: string;
  medicalSevereIssuesJson: string;
  ageWeightsJson: string;
  requestTypeScoresJson: string;
  situationMultipliersJson: string;
  priorityThresholdsJson: string;
}

// Rescuer Score Visibility Config Entity
export interface RescuerScoreVisibilityConfigEntity {
  minimumEvaluationCount: number;
  updatedBy: string | null;
  updatedAt: string;
}

// Update Rescuer Score Visibility Config Request
export interface UpdateRescuerScoreVisibilityConfigRequest {
  minimumEvaluationCount: number;
}
