export type SupplyBalanceActivity<Id extends string | number> = {
  activityId: Id;
  activityType: string;
  step: number;
  teamId: number | null;
  teamName?: string | null;
  supplies:
    | Array<{
        itemId?: number | null;
        itemName?: string | null;
        quantity: number;
        unit?: string | null;
      }>
    | null
    | undefined;
};

export type SupplyBalanceIssueType =
  | "insufficient-collected"
  | "remaining-supplies";

export type SupplyBalanceIssue<Id extends string | number> = {
  activityId: Id;
  step: number;
  teamId: number;
  teamName: string | null;
  itemKey: string;
  itemName: string;
  quantity: number;
  unit: string;
  issueType: SupplyBalanceIssueType;
  message: string;
};

export type SupplyBalanceAnalysis<Id extends string | number> = {
  issues: SupplyBalanceIssue<Id>[];
  issuesByActivityId: Record<string, SupplyBalanceIssue<Id>[]>;
  firstIssue: SupplyBalanceIssue<Id> | null;
  hasIssues: boolean;
};

const SUPPLY_INFLOW_TYPES = new Set(["COLLECT_SUPPLIES"]);
const SUPPLY_OUTFLOW_TYPES = new Set(["DELIVER_SUPPLIES", "RETURN_SUPPLIES"]);

function normalizeSupplyActivityType(value?: string | null): string {
  return (value ?? "").trim().toUpperCase().replaceAll(" ", "_");
}

function normalizeText(value?: string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toValidNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`.trim();
}

function getSupplyIdentity(supply: {
  itemId?: number | null;
  itemName?: string | null;
  unit?: string | null;
}) {
  const itemId = toValidNumber(supply.itemId);
  const unit = supply.unit?.trim() || "đơn vị";
  const itemName = supply.itemName?.trim() || "vật phẩm";

  return {
    itemKey:
      itemId != null
        ? `id:${itemId}`
        : `name:${normalizeText(itemName)}|unit:${normalizeText(unit)}`,
    itemName,
    unit,
  };
}

export function analyzeMissionSupplyBalance<Id extends string | number>(
  activities: SupplyBalanceActivity<Id>[],
): SupplyBalanceAnalysis<Id> {
  const orderedActivities = activities
    .map((activity, index) => ({ activity, index }))
    .sort((left, right) => {
      const stepDelta = left.activity.step - right.activity.step;
      return stepDelta !== 0 ? stepDelta : left.index - right.index;
    });

  const returnDesignatedKeysByTeam = new Map<number, Set<string>>();

  for (const { activity } of orderedActivities) {
    const teamId = toValidNumber(activity.teamId);
    if (teamId == null) {
      continue;
    }

    const normalizedActivityType = normalizeSupplyActivityType(
      activity.activityType,
    );
    if (normalizedActivityType !== "RETURN_SUPPLIES") {
      continue;
    }

    const existing =
      returnDesignatedKeysByTeam.get(teamId) ?? new Set<string>();
    for (const supply of activity.supplies ?? []) {
      const { itemKey } = getSupplyIdentity(supply);
      existing.add(itemKey);
    }
    returnDesignatedKeysByTeam.set(teamId, existing);
  }

  const issues: SupplyBalanceIssue<Id>[] = [];
  const balanceByKey = new Map<
    string,
    {
      balance: number;
      lastActivityId: Id;
      lastStep: number;
      itemName: string;
      unit: string;
      teamId: number;
      teamName: string | null;
    }
  >();

  for (const { activity } of orderedActivities) {
    const teamId = toValidNumber(activity.teamId);
    if (teamId == null) {
      continue;
    }

    const normalizedActivityType = normalizeSupplyActivityType(
      activity.activityType,
    );
    const isInflow = SUPPLY_INFLOW_TYPES.has(normalizedActivityType);
    const isOutflow = SUPPLY_OUTFLOW_TYPES.has(normalizedActivityType);
    if (!isInflow && !isOutflow) {
      continue;
    }

    for (const supply of activity.supplies ?? []) {
      const quantity = Math.max(1, Number(supply.quantity) || 1);
      const { itemKey, itemName, unit } = getSupplyIdentity(supply);

      if (
        normalizedActivityType === "DELIVER_SUPPLIES" &&
        returnDesignatedKeysByTeam.get(teamId)?.has(itemKey)
      ) {
        // Items explicitly planned to be returned are treated as reusable,
        // so DELIVER does not consume them from balance.
        continue;
      }

      const balanceKey = `${teamId}:${itemKey}`;
      const previous =
        balanceByKey.get(balanceKey) ??
        ({
          balance: 0,
          lastActivityId: activity.activityId,
          lastStep: activity.step,
          itemName,
          unit,
          teamId,
          teamName: activity.teamName?.trim() || null,
        } as const);

      const nextBalance = previous.balance + (isInflow ? quantity : -quantity);

      if (nextBalance < 0) {
        issues.push({
          activityId: activity.activityId,
          step: activity.step,
          teamId,
          teamName: activity.teamName?.trim() || previous.teamName || null,
          itemKey,
          itemName,
          quantity: Math.abs(nextBalance),
          unit,
          issueType: "insufficient-collected",
          message: `Bước ${activity.step}: ${
            activity.teamName?.trim() || "Đội này"
          } đang phân phát/hoàn trả dư ${formatQuantity(
            Math.abs(nextBalance),
            unit,
          )} ${itemName} so với số đã tiếp nhận trước đó.`,
        });

        balanceByKey.set(balanceKey, {
          ...previous,
          balance: 0,
          lastActivityId: activity.activityId,
          lastStep: activity.step,
          itemName,
          unit,
          teamName: activity.teamName?.trim() || previous.teamName || null,
        });
        continue;
      }

      balanceByKey.set(balanceKey, {
        ...previous,
        balance: nextBalance,
        lastActivityId: activity.activityId,
        lastStep: activity.step,
        itemName,
        unit,
        teamName: activity.teamName?.trim() || previous.teamName || null,
      });
    }
  }

  for (const [itemKey, state] of balanceByKey) {
    if (state.balance <= 0) {
      continue;
    }

    issues.push({
      activityId: state.lastActivityId,
      step: state.lastStep,
      teamId: state.teamId,
      teamName: state.teamName,
      itemKey,
      itemName: state.itemName,
      quantity: state.balance,
      unit: state.unit,
      issueType: "remaining-supplies",
      message: `Bước ${state.lastStep}: ${
        state.teamName || "Đội này"
      } còn dư ${formatQuantity(state.balance, state.unit)} ${
        state.itemName
      } chưa được phân phát hoặc hoàn trả. Hãy bổ sung ở bước sau hoặc giảm ở bước tiếp nhận.`,
    });
  }

  const issuesByActivityId = issues.reduce<
    Record<string, SupplyBalanceIssue<Id>[]>
  >((accumulator, issue) => {
    const key = String(issue.activityId);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(issue);
    return accumulator;
  }, {});

  return {
    issues,
    issuesByActivityId,
    firstIssue: issues[0] ?? null,
    hasIssues: issues.length > 0,
  };
}
