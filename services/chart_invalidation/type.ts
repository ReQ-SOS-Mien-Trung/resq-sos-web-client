"use client";

export type ChartInvalidation = {
  chartKey: string;
  endpoint: string;
  scope?: Record<string, unknown>;
  reason: string;
  changedAt: string;
};
