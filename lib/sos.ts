import type {
  ClothingGenderType,
  FoodDurationType,
  InjuredPerson,
  MedicalIssueType,
  MedicalSupportNeedType,
  SOSSituation,
  SOSClothingPerson,
  SOSSpecialDietPerson,
  SOSStructuredData,
  SOSSupplyDetails,
  SupplyType,
  WaterDurationType,
  WaterRemainingType,
} from "@/services/sos_request/type";

export type CoordinatorSOSType = "RESCUE" | "RELIEF" | "BOTH";
export type SharedPersonType = "ADULT" | "CHILD" | "ELDERLY";

export interface PeopleCountValue {
  adult: number;
  child: number;
  elderly: number;
}

export interface SharedPerson {
  id: string;
  type: SharedPersonType;
  index: number;
  customName: string;
}

export interface RescueMedicalInfoState {
  medicalIssues: MedicalIssueType[];
  otherDescription: string;
}

export interface RescueFormState {
  situation: SOSSituation | "";
  otherSituationDescription: string;
  injuredPersonIds: string[];
  medicalInfoByPerson: Record<string, RescueMedicalInfoState>;
  othersAreStable: boolean;
}

export interface SpecialDietInfoState {
  dietDescription: string;
}

export interface ClothingInfoState {
  gender?: ClothingGenderType;
}

export interface ReliefFormState {
  supplies: SupplyType[];
  otherSupplyDescription: string;
  waterDuration?: WaterDurationType;
  waterRemaining?: WaterRemainingType;
  foodDuration?: FoodDurationType;
  specialDietPersonIds: string[];
  specialDietInfoByPerson: Record<string, SpecialDietInfoState>;
  medicalNeeds: MedicalSupportNeedType[];
  medicalDescription: string;
  areBlanketsEnough?: boolean;
  blanketRequestCount?: number;
  clothingPersonIds: string[];
  clothingInfoByPerson: Record<string, ClothingInfoState>;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

export const SOS_TYPE_OPTIONS: Array<
  Option<CoordinatorSOSType> & { description: string }
> = [
  {
    value: "RESCUE",
    label: "Cứu hộ",
    description: "Giải cứu, sơ cứu, đưa ra khỏi khu vực nguy hiểm",
  },
  {
    value: "RELIEF",
    label: "Cứu trợ",
    description: "Nhu yếu phẩm, hỗ trợ sinh hoạt, chăn mền, quần áo",
  },
  {
    value: "BOTH",
    label: "Cả hai",
    description: "Vừa cần cứu hộ, vừa cần cứu trợ",
  },
];

export const RESCUE_SITUATION_OPTIONS: Option<SOSSituation>[] = [
  { value: "TRAPPED", label: "Bị mắc kẹt" },
  { value: "COLLAPSED", label: "Nhà sập" },
  { value: "DANGER_ZONE", label: "Kẹt trong khu vực nguy hiểm" },
  { value: "CANNOT_MOVE", label: "Không thể di chuyển" },
  { value: "FLOODING", label: "Nước dâng cao" },
  { value: "OTHER", label: "Khác" },
];

export const SUPPLY_OPTIONS: Option<SupplyType>[] = [
  { value: "WATER", label: "Nước uống" },
  { value: "FOOD", label: "Thực phẩm" },
  { value: "CLOTHES", label: "Quần áo" },
  { value: "BLANKET", label: "Chăn mền" },
  { value: "MEDICINE", label: "Y tế" },
  { value: "OTHER", label: "Khác" },
];

export const WATER_DURATION_OPTIONS: Option<WaterDurationType>[] = [
  { value: "UNDER_6H", label: "Dưới 6 giờ" },
  { value: "6_TO_12H", label: "6 - 12 giờ" },
  { value: "12_TO_24H", label: "12 - 24 giờ" },
  { value: "1_TO_2_DAYS", label: "1 - 2 ngày" },
  { value: "OVER_2_DAYS", label: "Trên 2 ngày" },
];

export const WATER_REMAINING_OPTIONS: Option<WaterRemainingType>[] = [
  { value: "NONE", label: "Không còn" },
  { value: "UNDER_2L", label: "Dưới 2 lít" },
  { value: "2_TO_5L", label: "2 - 5 lít" },
  { value: "OVER_5L", label: "Trên 5 lít" },
];

export const FOOD_DURATION_OPTIONS: Option<FoodDurationType>[] = [
  { value: "UNDER_12H", label: "Dưới 12 giờ" },
  { value: "12_TO_24H", label: "12 - 24 giờ" },
  { value: "1_TO_2_DAYS", label: "1 - 2 ngày" },
  { value: "2_TO_3_DAYS", label: "2 - 3 ngày" },
  { value: "OVER_3_DAYS", label: "Trên 3 ngày" },
];

export const MEDICAL_SUPPORT_OPTIONS: Option<MedicalSupportNeedType>[] = [
  {
    value: "COMMON_MEDICINE",
    label: "Thuốc thông dụng (hạ sốt, đau đầu, tiêu hóa...)",
  },
  {
    value: "FIRST_AID",
    label: "Vật tư sơ cứu (băng gạc, oxy già, thuốc đỏ...)",
  },
  {
    value: "CHRONIC_MAINTENANCE",
    label: "Người có bệnh nền cần thuốc duy trì",
  },
  {
    value: "MINOR_INJURY",
    label: "Người bị thương nhẹ (cần xử lý tại chỗ)",
  },
];

export const CLOTHING_GENDER_OPTIONS: Option<ClothingGenderType>[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
];

type MedicalIssueCategory = "injury" | "danger" | "special" | "other";

const MEDICAL_CATEGORY_LABELS: Record<MedicalIssueCategory, string> = {
  injury: "Chấn thương",
  danger: "Tình trạng nguy hiểm",
  special: "Tình trạng đặc thù",
  other: "Khác",
};

const PERSON_TYPE_LABELS: Record<SharedPersonType, string> = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  ELDERLY: "Người già",
};

const PERSON_TYPE_ICONS: Record<SharedPersonType, string> = {
  ADULT: "🧑",
  CHILD: "👶",
  ELDERLY: "👴",
};

const SITUATION_LABELS: Record<string, string> = {
  TRAPPED: "Bị mắc kẹt",
  ISOLATED: "Bị cô lập",
  STRANDED: "Mắc cạn",
  COLLAPSED: "Nhà sập",
  LANDSLIDE: "Sạt lở",
  ACCIDENT: "Tai nạn",
  DANGER_ZONE: "Khu vực nguy hiểm",
  CANNOT_MOVE: "Không thể di chuyển",
  FLOODING: "Nước dâng cao",
  FLOOD: "Nước dâng cao",
  OTHER: "Khác",
};

const SITUATION_CODE_ALIASES: Record<string, string> = {
  COLLAPSE: "COLLAPSED",
  BUILDING_COLLAPSE: "COLLAPSED",
  BUILDING_COLLAPSED: "COLLAPSED",
  MUDSLIDE: "LANDSLIDE",
  SLIDE: "LANDSLIDE",
  TRAFFIC_ACCIDENT: "ACCIDENT",
};

function normalizeSituationCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

const SUPPLY_LABELS: Record<string, string> = {
  WATER: "Nước uống",
  FOOD: "Thực phẩm",
  CLOTHES: "Quần áo",
  BLANKET: "Chăn mền",
  MEDICINE: "Y tế",
  OTHER: "Khác",
  RESCUE_EQUIPMENT: "Thiết bị cứu hộ",
  TRANSPORTATION: "Phương tiện",
};

const MEDICAL_ISSUE_LABELS: Record<string, string> = {
  BLEEDING: "Chảy máu",
  SEVERELY_BLEEDING: "Chảy máu nặng",
  FRACTURE: "Gãy xương",
  HEAD_INJURY: "Chấn thương đầu",
  BURNS: "Bỏng",
  UNCONSCIOUS: "Bất tỉnh",
  BREATHING_DIFFICULTY: "Khó thở",
  CHEST_PAIN_STROKE: "Đau ngực / nghi đột quỵ",
  CANNOT_MOVE: "Không thể di chuyển",
  DROWNING: "Đuối nước",
  HIGH_FEVER: "Sốt cao",
  DEHYDRATION: "Mất nước",
  INFANT_NEEDS_MILK: "Trẻ sơ sinh cần sữa",
  LOST_PARENT: "Lạc cha mẹ",
  CHRONIC_DISEASE: "Cần thuốc bệnh nền",
  CONFUSION: "Lú lẫn / mất phương hướng",
  NEEDS_MEDICAL_DEVICE: "Cần thiết bị y tế",
  MOBILITY_IMPAIRMENT: "Hạn chế vận động",
  PREGNANCY: "Thai kỳ",
  OTHER: "Khác",
};

const WATER_DURATION_LABELS: Record<string, string> = Object.fromEntries(
  WATER_DURATION_OPTIONS.map((option) => [option.value, option.label]),
);

const WATER_REMAINING_LABELS: Record<string, string> = Object.fromEntries(
  WATER_REMAINING_OPTIONS.map((option) => [option.value, option.label]),
);

const FOOD_DURATION_LABELS: Record<string, string> = Object.fromEntries(
  FOOD_DURATION_OPTIONS.map((option) => [option.value, option.label]),
);

const MEDICAL_SUPPORT_LABELS: Record<string, string> = Object.fromEntries(
  MEDICAL_SUPPORT_OPTIONS.map((option) => [option.value, option.label]),
);

const CLOTHING_GENDER_LABELS: Record<string, string> = Object.fromEntries(
  CLOTHING_GENDER_OPTIONS.map((option) => [option.value, option.label]),
);

const MEDICAL_ISSUES_BY_PERSON_TYPE: Record<
  SharedPersonType,
  Array<{
    category: MedicalIssueCategory;
    issues: MedicalIssueType[];
  }>
> = {
  ADULT: [
    {
      category: "injury",
      issues: ["SEVERELY_BLEEDING", "FRACTURE", "HEAD_INJURY"],
    },
    {
      category: "danger",
      issues: [
        "UNCONSCIOUS",
        "BREATHING_DIFFICULTY",
        "CHEST_PAIN_STROKE",
        "CANNOT_MOVE",
        "DROWNING",
      ],
    },
    {
      category: "special",
      issues: ["CHRONIC_DISEASE", "OTHER"],
    },
  ],
  CHILD: [
    {
      category: "injury",
      issues: ["BLEEDING", "FRACTURE"],
    },
    {
      category: "danger",
      issues: [
        "UNCONSCIOUS",
        "BREATHING_DIFFICULTY",
        "HIGH_FEVER",
        "DEHYDRATION",
        "DROWNING",
      ],
    },
    {
      category: "special",
      issues: ["INFANT_NEEDS_MILK", "LOST_PARENT"],
    },
    {
      category: "other",
      issues: ["OTHER"],
    },
  ],
  ELDERLY: [
    {
      category: "injury",
      issues: ["FRACTURE", "BLEEDING", "BURNS"],
    },
    {
      category: "danger",
      issues: [
        "UNCONSCIOUS",
        "BREATHING_DIFFICULTY",
        "CHEST_PAIN_STROKE",
        "CANNOT_MOVE",
        "DROWNING",
      ],
    },
    {
      category: "special",
      issues: ["CHRONIC_DISEASE", "CONFUSION", "NEEDS_MEDICAL_DEVICE"],
    },
    {
      category: "other",
      issues: ["OTHER"],
    },
  ],
};

export function emptyPeopleCount(): PeopleCountValue {
  return { adult: 1, child: 0, elderly: 0 };
}

export function createEmptyRescueState(): RescueFormState {
  return {
    situation: "",
    otherSituationDescription: "",
    injuredPersonIds: [],
    medicalInfoByPerson: {},
    othersAreStable: false,
  };
}

export function createEmptyReliefState(): ReliefFormState {
  return {
    supplies: [],
    otherSupplyDescription: "",
    specialDietPersonIds: [],
    specialDietInfoByPerson: {},
    medicalNeeds: [],
    medicalDescription: "",
    clothingPersonIds: [],
    clothingInfoByPerson: {},
  };
}

export function peopleCountTotal(peopleCount: PeopleCountValue): number {
  return peopleCount.adult + peopleCount.child + peopleCount.elderly;
}

export function buildSharedPeople(
  peopleCount: PeopleCountValue,
  existingPeople: SharedPerson[],
): SharedPerson[] {
  const existingNameMap = new Map(
    existingPeople.map((person) => [person.id, person.customName]),
  );
  const nextPeople: SharedPerson[] = [];

  const buildGroup = (type: SharedPersonType, count: number) => {
    for (let index = 1; index <= count; index += 1) {
      const id = makePersonId(type, index);
      nextPeople.push({
        id,
        type,
        index,
        customName: existingNameMap.get(id) ?? "",
      });
    }
  };

  buildGroup("ADULT", peopleCount.adult);
  buildGroup("CHILD", peopleCount.child);
  buildGroup("ELDERLY", peopleCount.elderly);

  return nextPeople;
}

export function syncRescueStateToPeople(
  rescue: RescueFormState,
  validIds: string[],
): RescueFormState {
  const validIdSet = new Set(validIds);
  const injuredPersonIds = rescue.injuredPersonIds.filter((id) =>
    validIdSet.has(id),
  );
  const medicalInfoByPerson = Object.fromEntries(
    Object.entries(rescue.medicalInfoByPerson).filter(([personId]) =>
      validIdSet.has(personId),
    ),
  );

  return {
    ...rescue,
    injuredPersonIds,
    medicalInfoByPerson,
    othersAreStable:
      injuredPersonIds.length > 0 && injuredPersonIds.length < validIds.length
        ? rescue.othersAreStable
        : false,
  };
}

export function syncReliefStateToPeople(
  relief: ReliefFormState,
  validIds: string[],
  maxPeopleCount: number,
): ReliefFormState {
  const validIdSet = new Set(validIds);
  const blanketRequestCount =
    relief.areBlanketsEnough === false && relief.blanketRequestCount
      ? clamp(relief.blanketRequestCount, 1, Math.max(1, maxPeopleCount))
      : undefined;

  return {
    ...relief,
    specialDietPersonIds: relief.specialDietPersonIds.filter((id) =>
      validIdSet.has(id),
    ),
    specialDietInfoByPerson: Object.fromEntries(
      Object.entries(relief.specialDietInfoByPerson).filter(([personId]) =>
        validIdSet.has(personId),
      ),
    ),
    clothingPersonIds: relief.clothingPersonIds.filter((id) =>
      validIdSet.has(id),
    ),
    clothingInfoByPerson: Object.fromEntries(
      Object.entries(relief.clothingInfoByPerson).filter(([personId]) =>
        validIdSet.has(personId),
      ),
    ),
    blanketRequestCount,
  };
}

export function isRescueSOSType(sosType?: CoordinatorSOSType | null): boolean {
  return sosType === "RESCUE" || sosType === "BOTH";
}

export function isReliefSOSType(sosType?: CoordinatorSOSType | null): boolean {
  return sosType === "RELIEF" || sosType === "BOTH";
}

export function makePersonId(type: SharedPersonType, index: number): string {
  return `${type.toLowerCase()}_${index}`;
}

export function getPersonTypeLabel(type: SharedPersonType | string): string {
  return PERSON_TYPE_LABELS[type as SharedPersonType] ?? "Nạn nhân";
}

export function getPersonIcon(type: SharedPersonType | string): string {
  return PERSON_TYPE_ICONS[type as SharedPersonType] ?? "🧍";
}

export function getPersonDefaultName(person: SharedPerson): string {
  return `${getPersonTypeLabel(person.type)} ${person.index}`;
}

export function getPersonDisplayName(person: SharedPerson): string {
  return person.customName.trim() || getPersonDefaultName(person);
}

export function getSituationLabel(value?: string | null): string {
  if (!value) return "Chưa rõ";

  const normalized = normalizeSituationCode(value);
  const mappedCode = SITUATION_CODE_ALIASES[normalized] ?? normalized;
  const label = SITUATION_LABELS[mappedCode];
  if (label) return label;

  // Avoid showing raw backend enum-like English tags in UI badges.
  if (/^[A-Z0-9_]+$/.test(normalized)) return SITUATION_LABELS.OTHER;

  return value;
}

export function getSupplyLabel(value?: string | null): string {
  return value ? (SUPPLY_LABELS[value] ?? value) : "Chưa rõ";
}

export function getMedicalIssueLabel(value?: string | null): string {
  return value ? (MEDICAL_ISSUE_LABELS[value] ?? value) : "Chưa rõ";
}

export function getWaterDurationLabel(value?: string | null): string {
  return value ? (WATER_DURATION_LABELS[value] ?? value) : "Chưa rõ";
}

export function getWaterRemainingLabel(value?: string | null): string {
  return value ? (WATER_REMAINING_LABELS[value] ?? value) : "Chưa rõ";
}

export function getFoodDurationLabel(value?: string | null): string {
  return value ? (FOOD_DURATION_LABELS[value] ?? value) : "Chưa rõ";
}

export function getMedicalSupportNeedLabel(value?: string | null): string {
  return value ? (MEDICAL_SUPPORT_LABELS[value] ?? value) : "Chưa rõ";
}

export function getClothingGenderLabel(value?: string | null): string {
  return value ? (CLOTHING_GENDER_LABELS[value] ?? value) : "Chưa rõ";
}

export function groupedMedicalIssuesForPersonType(
  type: SharedPersonType,
): Array<{ category: string; issues: MedicalIssueType[] }> {
  return MEDICAL_ISSUES_BY_PERSON_TYPE[type].map((group) => ({
    category: MEDICAL_CATEGORY_LABELS[group.category],
    issues: group.issues,
  }));
}

export function buildStructuredDataFromForm(args: {
  sosType: CoordinatorSOSType;
  peopleCount: PeopleCountValue;
  sharedPeople: SharedPerson[];
  rescue: RescueFormState;
  relief: ReliefFormState;
  additionalDescription: string;
}): Partial<SOSStructuredData> {
  const { sosType, peopleCount, sharedPeople, rescue, relief } = args;
  const includeRescue = isRescueSOSType(sosType);
  const includeRelief = isReliefSOSType(sosType);
  const orderedPeople = (personIds: string[]) =>
    sharedPeople.filter((person) => personIds.includes(person.id));

  const injuredPersons: InjuredPerson[] = includeRescue
    ? orderedPeople(rescue.injuredPersonIds).map((person) => ({
        person_type: person.type,
        index: person.index,
        name: getPersonDisplayName(person),
        custom_name: person.customName.trim() || null,
        medical_issues:
          rescue.medicalInfoByPerson[person.id]?.medicalIssues ?? [],
        severity: "NONE",
      }))
    : [];

  const medicalIssues = Array.from(
    new Set(
      injuredPersons.flatMap((person) => person.medical_issues).filter(Boolean),
    ),
  );

  let supplyDetails: SOSSupplyDetails | undefined;
  if (includeRelief) {
    const specialDietPersons: SOSSpecialDietPerson[] = orderedPeople(
      relief.specialDietPersonIds,
    ).map((person) => ({
      person_type: person.type,
      index: person.index,
      name: getPersonDisplayName(person),
      custom_name: person.customName.trim() || null,
      diet_description:
        relief.specialDietInfoByPerson[person.id]?.dietDescription?.trim() ||
        null,
    }));

    const clothingPersons: SOSClothingPerson[] = orderedPeople(
      relief.clothingPersonIds,
    )
      .filter((person) => relief.clothingInfoByPerson[person.id]?.gender)
      .map((person) => ({
        person_type: person.type,
        index: person.index,
        name: getPersonDisplayName(person),
        custom_name: person.customName.trim() || null,
        gender: relief.clothingInfoByPerson[person.id]!.gender!,
      }));

    const hasSomeDetails =
      relief.waterDuration ||
      relief.waterRemaining ||
      relief.foodDuration ||
      specialDietPersons.length > 0 ||
      relief.medicalNeeds.length > 0 ||
      relief.medicalDescription.trim() ||
      relief.areBlanketsEnough !== undefined ||
      relief.blanketRequestCount !== undefined ||
      clothingPersons.length > 0;

    if (hasSomeDetails) {
      supplyDetails = {
        water_duration: relief.waterDuration ?? null,
        water_remaining: relief.waterRemaining ?? null,
        food_duration: relief.foodDuration ?? null,
        special_diet_persons:
          specialDietPersons.length > 0 ? specialDietPersons : null,
        medical_needs:
          relief.medicalNeeds.length > 0 ? relief.medicalNeeds : null,
        medical_description: relief.medicalDescription.trim() || null,
        are_blankets_enough:
          relief.areBlanketsEnough !== undefined
            ? relief.areBlanketsEnough
            : null,
        blanket_request_count:
          relief.areBlanketsEnough === false
            ? (relief.blanketRequestCount ?? null)
            : null,
        clothing_persons: clothingPersons.length > 0 ? clothingPersons : null,
      };
    }
  }

  return {
    ...(includeRescue
      ? {
          situation: rescue.situation || undefined,
          other_situation_description:
            rescue.situation === "OTHER"
              ? rescue.otherSituationDescription.trim() || null
              : null,
          has_injured: injuredPersons.length > 0,
          medical_issues: medicalIssues,
          other_medical_description:
            Array.from(
              new Set(
                Object.values(rescue.medicalInfoByPerson)
                  .map((info) => info.otherDescription.trim())
                  .filter(Boolean),
              ),
            ).join("; ") || null,
          others_are_stable:
            injuredPersons.length > 0 &&
            injuredPersons.length < peopleCountTotal(peopleCount)
              ? rescue.othersAreStable
              : false,
          can_move: rescue.situation !== "CANNOT_MOVE",
          need_medical: injuredPersons.length > 0 || medicalIssues.length > 0,
          injured_persons: injuredPersons,
        }
      : {}),
    ...(includeRelief
      ? {
          supplies: relief.supplies,
          other_supply_description:
            relief.otherSupplyDescription.trim() || null,
          supply_details: supplyDetails ?? null,
        }
      : {}),
    people_count: {
      adult: peopleCount.adult,
      child: peopleCount.child,
      elderly: peopleCount.elderly,
    },
    additional_description: args.additionalDescription.trim() || null,
  };
}

export function buildGeneratedSOSMessage(args: {
  sosType: CoordinatorSOSType;
  peopleCount: PeopleCountValue;
  sharedPeople: SharedPerson[];
  rescue: RescueFormState;
  relief: ReliefFormState;
  additionalDescription: string;
}): string {
  const { sosType, rescue, relief, peopleCount, sharedPeople } = args;
  const parts: string[] = [];
  const orderedPeople = (personIds: string[]) =>
    sharedPeople.filter((person) => personIds.includes(person.id));

  parts.push(`[${getSosTypeLabel(sosType)}]`);

  if (isRescueSOSType(sosType)) {
    if (rescue.situation) {
      parts.push(`Tình trạng: ${getSituationLabel(rescue.situation)}`);
    }

    parts.push(`Số người: ${peopleCountTotal(peopleCount)}`);

    if (peopleCount.child > 0) {
      parts.push(`Trẻ em: ${peopleCount.child}`);
    }

    if (peopleCount.elderly > 0) {
      parts.push(`Người già: ${peopleCount.elderly}`);
    }

    if (rescue.injuredPersonIds.length > 0) {
      const injuredSummaries = orderedPeople(rescue.injuredPersonIds)
        .map((person) => {
          const info = rescue.medicalInfoByPerson[person.id];
          if (!info) return null;
          const issues = info.medicalIssues
            .map((issue) => getMedicalIssueLabel(issue))
            .join(", ");
          return issues
            ? `${getPersonDisplayName(person)} - ${issues}`
            : `${getPersonDisplayName(person)} - Chưa rõ tình trạng`;
        })
        .filter(Boolean);

      if (injuredSummaries.length > 0) {
        parts.push(`Bị thương: ${injuredSummaries.join("; ")}`);
      }
    }
  }

  if (isReliefSOSType(sosType)) {
    if (relief.supplies.length > 0) {
      parts.push(
        `Cần: ${relief.supplies.map((supply) => getSupplyLabel(supply)).join(", ")}`,
      );
    }

    parts.push(`Số người: ${peopleCountTotal(peopleCount)}`);

    if (relief.waterDuration) {
      parts.push(`Nước: ${getWaterDurationLabel(relief.waterDuration)}`);
    }

    if (relief.waterRemaining) {
      parts.push(`Nước còn: ${getWaterRemainingLabel(relief.waterRemaining)}`);
    }

    if (relief.foodDuration) {
      parts.push(`Thực phẩm: ${getFoodDurationLabel(relief.foodDuration)}`);
    }

    const specialDietSummaries = orderedPeople(relief.specialDietPersonIds)
      .map((person) => {
        const description =
          relief.specialDietInfoByPerson[person.id]?.dietDescription?.trim() ??
          "";
        return description
          ? `${getPersonDisplayName(person)} (${description})`
          : getPersonDisplayName(person);
      })
      .filter(Boolean);

    if (specialDietSummaries.length > 0) {
      parts.push(`Ăn đặc biệt: ${specialDietSummaries.join("; ")}`);
    }

    if (relief.medicalNeeds.length > 0) {
      parts.push(
        `Y tế: ${relief.medicalNeeds.map((need) => getMedicalSupportNeedLabel(need)).join(", ")}`,
      );
    }

    if (relief.medicalDescription.trim()) {
      parts.push(`Mô tả y tế: ${relief.medicalDescription.trim()}`);
    }

    if (relief.areBlanketsEnough !== undefined) {
      if (relief.areBlanketsEnough) {
        parts.push("Chăn mền: đủ");
      } else if (relief.blanketRequestCount) {
        parts.push(`Chăn mền: cần thêm ${relief.blanketRequestCount}`);
      } else {
        parts.push("Chăn mền: không đủ");
      }
    }

    const clothingSummaries = orderedPeople(relief.clothingPersonIds)
      .map((person) => {
        const gender = relief.clothingInfoByPerson[person.id]?.gender;
        return gender
          ? `${getPersonDisplayName(person)} (${getClothingGenderLabel(gender)})`
          : getPersonDisplayName(person);
      })
      .filter(Boolean);

    if (clothingSummaries.length > 0) {
      parts.push(`Quần áo: ${clothingSummaries.join("; ")}`);
    }
  }

  if (args.additionalDescription.trim()) {
    parts.push(`Ghi chú: ${args.additionalDescription.trim()}`);
  }

  return parts.join(" | ");
}

export function deriveSOSNeeds(
  structuredData: SOSStructuredData | null | undefined,
  sosType: string | null | undefined,
): {
  medical: boolean;
  food: boolean;
  boat: boolean;
} {
  const supplies = structuredData?.supplies ?? [];
  const supplyDetails = structuredData?.supply_details;
  const normalizedType = (sosType ?? "").toUpperCase();
  const normalizedSituation = (structuredData?.situation ?? "").toUpperCase();

  const medical =
    structuredData?.need_medical === true ||
    (structuredData?.injured_persons?.length ?? 0) > 0 ||
    (structuredData?.medical_issues?.length ?? 0) > 0 ||
    (supplyDetails?.medical_needs?.length ?? 0) > 0 ||
    supplies.includes("MEDICINE");

  const food = supplies.includes("FOOD") || supplies.includes("WATER");

  const boat =
    supplies.includes("RESCUE_EQUIPMENT") ||
    supplies.includes("TRANSPORTATION") ||
    ((normalizedType === "RESCUE" || normalizedType === "BOTH") &&
      (structuredData?.can_move === false ||
        ["FLOODING", "TRAPPED", "ISOLATED", "STRANDED", "DANGER_ZONE"].includes(
          normalizedSituation,
        )));

  return { medical, food, boat };
}

export function getSosTypeLabel(value?: CoordinatorSOSType | string | null) {
  switch (value) {
    case "RESCUE":
      return "CỨU HỘ";
    case "RELIEF":
      return "CỨU TRỢ";
    case "BOTH":
      return "CỨU HỘ + CỨU TRỢ";
    default:
      return value || "SOS";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
