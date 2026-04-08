import type { AIPrompt, PromptTemplate } from "@/types/admin-pages";

export const mockAIPrompts: AIPrompt[] = [
  {
    id: "1",
    name: "Dispatch Decision Prompt",
    category: "dispatch",
    prompt: "Phân tích yêu cầu cứu hộ sau đây và đưa ra quyết định điều phối:\n\nYêu cầu: {request}\nVị trí: {location}\nMức độ khẩn cấp: {urgency}\n\nHãy đánh giá và đề xuất:\n1. Mức độ ưu tiên (1-10)\n2. Số lượng cứu hộ viên cần thiết\n3. Thiết bị cần thiết\n4. Thời gian ước tính",
    variables: ["request", "location", "urgency"],
    version: 3,
    isActive: true,
    createdAt: "2024-11-01T10:00:00Z",
    updatedAt: "2024-12-15T14:30:00Z",
    testResults: [
      {
        input: "request: Gia đình bị mắc kẹt trong lũ\nlocation: Phường Phú Hội, Huế\nurgency: Cao",
        output: "Mức độ ưu tiên: 9\nSố lượng cứu hộ viên: 4-6\nThiết bị: Thuyền, phao cứu sinh, dây thừng\nThời gian ước tính: 2-3 giờ",
        timestamp: "2024-12-15T14:30:00Z",
      },
    ],
  },
  {
    id: "2",
    name: "Request Classification Prompt",
    category: "classification",
    prompt: "Phân loại yêu cầu cứu hộ sau đây vào một trong các loại: rescue, evacuation, supply, medical, other\n\nYêu cầu: {request}\nMô tả: {description}",
    variables: ["request", "description"],
    version: 2,
    isActive: true,
    createdAt: "2024-11-05T10:00:00Z",
    updatedAt: "2024-12-10T09:15:00Z",
  },
  {
    id: "3",
    name: "Resource Recommendation Prompt",
    category: "recommendation",
    prompt: "Dựa trên tình hình thiên tai hiện tại, đề xuất phân bổ tài nguyên:\n\nKhu vực: {region}\nTình hình: {situation}\nTài nguyên hiện có: {resources}",
    variables: ["region", "situation", "resources"],
    version: 1,
    isActive: true,
    createdAt: "2024-11-10T10:00:00Z",
    updatedAt: "2024-11-10T10:00:00Z",
  },
];

export const mockPromptTemplates: PromptTemplate[] = [
  {
    id: "template1",
    name: "Dispatch Template v1",
    category: "dispatch",
    template: "Phân tích và đưa ra quyết định điều phối cho: {request}",
    description: "Template cơ bản cho điều phối cứu hộ",
  },
  {
    id: "template2",
    name: "Classification Template",
    category: "classification",
    template: "Phân loại: {request} - {description}",
    description: "Template phân loại yêu cầu",
  },
  {
    id: "template3",
    name: "Recommendation Template",
    category: "recommendation",
    template: "Đề xuất tài nguyên cho {region} với tình hình {situation}",
    description: "Template đề xuất tài nguyên",
  },
];
