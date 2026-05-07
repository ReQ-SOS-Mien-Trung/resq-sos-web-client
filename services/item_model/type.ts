export interface ItemModelEntity {
  id: number;
  name: string;
  description?: string | null;
  unit: string;
  itemType: string;
  volumePerUnit: number;
  weightPerUnit: number;
  imageUrl?: string | null;
  targetGroups: string[];
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetItemModelsParams {
  categoryId?: number;
  itemType?: string;
}

export interface UpdateItemModelPayload {
  categoryId: number;
  name: string;
  description: string;
  unit: string;
  itemType: string;
  targetGroups: string[];
  imageUrl: string;
  volumePerUnit: number;
  weightPerUnit: number;
}
