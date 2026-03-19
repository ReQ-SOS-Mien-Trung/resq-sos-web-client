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
