# Hướng dẫn tích hợp Frontend - Conversation APIs

Tài liệu này mô tả contract thực tế của backend cho module chat hỗ trợ Victim - AI - Coordinator.

- REST base route: `/operations/conversations`
- SignalR hub: `/hubs/chat`
- Auth: JWT Bearer bắt buộc cho toàn bộ API/hub

## 1) Tổng quan luồng nghiệp vụ

Luồng chuẩn cho Victim:

1. Gọi `GET /operations/conversations/my-conversation` để lấy hoặc tạo phòng chat đang ở trạng thái `AiAssist`.
2. Chọn chủ đề bằng `POST /operations/conversations/{conversationId}/select-topic`.
3. Nếu topic là `SosRequestSupport`, FE hiển thị danh sách SOS để Victim chọn bằng `POST /operations/conversations/{conversationId}/link-sos-request`.
4. Khi status đã là `WaitingCoordinator`, Coordinator có thể nhìn thấy phòng chờ và join.
5. Khi Coordinator join thành công, status chuyển `CoordinatorActive`.
6. Sau đó chat real-time qua SignalR.

Luồng chuẩn cho Coordinator:

1. Gọi `GET /operations/conversations/waiting` để lấy danh sách phòng đang chờ.
2. Chọn 1 phòng và gọi `POST /operations/conversations/{conversationId}/join`.
3. Kết nối SignalR và gọi method `JoinConversation(conversationId)` để vào group nhận tin nhắn.

## 2) Enum FE cần map

### ConversationStatus

- `AiAssist`: AI hỗ trợ ban đầu, chưa có coordinator.
- `WaitingCoordinator`: đã xác nhận nhu cầu, đang chờ coordinator.
- `CoordinatorActive`: coordinator đã tham gia.
- `Closed`: phiên chat kết thúc.

### MessageType

- `UserMessage`
- `AiMessage`
- `SystemMessage`

## 3) Endpoint chi tiết

## 3.1 `GET /operations/conversations/my-conversation`

Mục đích:

- Lấy conversation `AiAssist` hiện tại của victim.
- Nếu chưa có, backend tạo mới.
- Luôn trả thêm gợi ý chủ đề từ AI để render quick-picks.

Request body: không có.

Response 200 (shape):

```json
{
  "ConversationId": 123,
  "VictimId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
  "Status": "AiAssist",
  "SelectedTopic": null,
  "LinkedSosRequestId": null,
  "CreatedAt": "2026-03-18T03:21:10.0000000Z",
  "AiGreetingMessage": "...",
  "TopicSuggestions": [
    {
      "Key": "SosRequestSupport",
      "Title": "Hỗ trợ theo SOS đã gửi",
      "Description": "..."
    }
  ],
  "Participants": [
    {
      "UserId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
      "UserName": "Victim Name",
      "Role": "Victim",
      "JoinedAt": "2026-03-18T03:21:10.0000000Z"
    }
  ]
}
```

Lưu ý FE:

- Nếu conversation trước đã chuyển khỏi `AiAssist`, lần gọi này sẽ tạo conversation mới.
- `TopicSuggestions` có thể rỗng nếu AI service không trả thành công.

## 3.2 `GET /operations/conversations/my-conversations`

Mục đích: Victim xem toàn bộ lịch sử conversation của chính mình (mới nhất trước).

Response 200 (shape):

```json
[
  {
    "ConversationId": 123,
    "Status": "CoordinatorActive",
    "SelectedTopic": "SosRequestSupport",
    "LinkedSosRequestId": 456,
    "CreatedAt": "2026-03-18T03:21:10.0000000Z",
    "UpdatedAt": "2026-03-18T03:30:10.0000000Z"
  }
]
```

## 3.3 `POST /operations/conversations/{conversationId}/select-topic`

Mục đích: Victim chọn chủ đề hỗ trợ.

Request body:

```json
{
  "topicKey": "SosRequestSupport"
}
```

Response 200 (shape):

```json
{
  "ConversationId": 123,
  "Status": "WaitingCoordinator",
  "TopicKey": "SosRequestSupport",
  "AiResponseMessage": "...",
  "SosRequests": [
    {
      "Id": 456,
      "PacketId": "...",
      "ClusterId": 12,
      "UserId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
      "SosType": "Medical",
      "RawMessage": "...",
      "OriginId": "...",
      "Status": "Pending",
      "PriorityLevel": "High",
      "Latitude": 10.77,
      "Longitude": 106.69,
      "LocationAccuracy": 12.5,
      "Timestamp": "2026-03-18T03:20:00.0000000Z",
      "CreatedAt": "2026-03-18T03:20:01.0000000Z",
      "ReceivedAt": "2026-03-18T03:20:02.0000000Z",
      "LastUpdatedAt": "2026-03-18T03:20:03.0000000Z"
    }
  ]
}
```

Lưu ý FE quan trọng:

- Nếu `topicKey = SosRequestSupport`:
  - Backend trả `SosRequests`.
  - Nếu victim không có SOS khả dụng, status có thể vẫn là `AiAssist`.
- Nếu topic khác `SosRequestSupport`:
  - `SosRequests` sẽ là `null`.
  - Status chuyển thẳng `WaitingCoordinator`.

## 3.4 `POST /operations/conversations/{conversationId}/link-sos-request`

Mục đích: Victim chọn 1 SOS cụ thể để gắn vào conversation.

Request body:

```json
{
  "sosRequestId": 456
}
```

Response 200 (shape):

```json
{
  "ConversationId": 123,
  "LinkedSosRequestId": 456,
  "Status": "WaitingCoordinator",
  "AiConfirmationMessage": "..."
}
```

Lưu ý FE:

- SOS phải thuộc chính victim đang đăng nhập, nếu không sẽ bị 403.

## 3.5 `GET /operations/conversations/waiting`

Mục đích: Coordinator lấy danh sách các phòng đang chờ hỗ trợ.

Response 200 (shape):

```json
[
  {
    "ConversationId": 123,
    "VictimId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
    "VictimName": "Victim Name",
    "SelectedTopic": "SosRequestSupport",
    "LinkedSosRequestId": 456,
    "UpdatedAt": "2026-03-18T03:30:10.0000000Z"
  }
]
```

## 3.6 `POST /operations/conversations/{conversationId}/join`

Mục đích: Coordinator tham gia hỗ trợ conversation.

Request body: không có.

Response 200 (shape):

```json
{
  "ConversationId": 123,
  "CoordinatorId": "e8a2f48b-2a4e-4f5f-bf8a-ea6428ca6f84",
  "Status": "CoordinatorActive",
  "SystemMessage": "..."
}
```

Lưu ý FE:

- Không join được nếu conversation đang `AiAssist` hoặc `Closed` (400).
- Join endpoint này khác với SignalR join group. FE nên gọi REST join trước, rồi mới gọi SignalR `JoinConversation`.

## 3.7 `GET /operations/conversations/{conversationId}/messages?page=1&pageSize=50`

Mục đích: Lấy lịch sử tin nhắn có phân trang.

Request query:

- `page` mặc định 1
- `pageSize` mặc định 50

Response 200 (shape):

```json
{
  "ConversationId": 123,
  "Page": 1,
  "PageSize": 50,
  "Messages": [
    {
      "Id": 1,
      "SenderId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
      "SenderName": "Victim Name",
      "Content": "Tôi cần hỗ trợ",
      "MessageType": "UserMessage",
      "CreatedAt": "2026-03-18T03:22:00.0000000Z"
    }
  ]
}
```

Lưu ý FE:

- Tin nhắn trả về theo thứ tự cũ nhất trước (`CreatedAt` tăng dần).
- Nếu user không phải participant sẽ nhận 403.

## 3.8 `GET /operations/conversations/mission/{missionId}` (Legacy)

Mục đích: API legacy cho màn hình theo mission.

Response 200 (shape):

```json
{
  "MissionId": 999,
  "Conversations": [
    {
      "ConversationId": 123,
      "Coordinator": {
        "Id": 1,
        "UserId": "e8a2f48b-2a4e-4f5f-bf8a-ea6428ca6f84",
        "UserName": "Coordinator Name",
        "RoleInConversation": "coordinator",
        "JoinedAt": "2026-03-18T03:30:10.0000000Z"
      },
      "Victim": {
        "Id": 2,
        "UserId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
        "UserName": "Victim Name",
        "RoleInConversation": "victim",
        "JoinedAt": "2026-03-18T03:21:10.0000000Z"
      }
    }
  ]
}
```

Lưu ý FE:

- Legacy flow này dùng role chữ thường `coordinator/victim`, khác với flow mới (`Coordinator/Victim`).

## 4) SignalR contract cho chat real-time

Hub endpoint: `/hubs/chat`

Client kết nối với JWT qua query string:

- Ví dụ: `/hubs/chat?access_token=<JWT>`

## 4.1 Client gọi lên hub

- `JoinConversation(conversationId: number)`
- `LeaveConversation(conversationId: number)`
- `SendMessage(conversationId: number, content: string)`
- `CoordinatorJoin(conversationId: number)`

## 4.2 Server push event về client

- `JoinedConversation`

```json
{ "conversationId": 123, "message": "Đã tham gia cuộc trò chuyện." }
```

- `LeftConversation`

```json
{ "conversationId": 123 }
```

- `ReceiveMessage`

```json
{
  "Id": 99,
  "ConversationId": 123,
  "SenderId": "8f6f9f1a-4f9f-4f7b-b0ab-0ce0d9ee3e33",
  "SenderName": "Victim Name",
  "Content": "Xin hỗ trợ",
  "MessageType": "UserMessage",
  "CreatedAt": "2026-03-18T03:31:10.0000000Z"
}
```

- `CoordinatorJoined`

```json
{
  "ConversationId": 123,
  "CoordinatorId": "e8a2f48b-2a4e-4f5f-bf8a-ea6428ca6f84",
  "Status": "CoordinatorActive",
  "SystemMessage": "..."
}
```

- `Error`

```json
"Bạn không phải là thành viên của conversation này."
```

## 5) Error format FE cần parse

Middleware lỗi trả JSON dạng camelCase:

```json
{
  "message": "Bạn không phải là thành viên của conversation này.",
  "innerError": null,
  "errors": null
}
```

Status code thường gặp cho module này:

- `400` bad request
- `401` thiếu/invalid token
- `403` không đủ quyền
- `404` không tìm thấy conversation/SOS
- `409` conflict
- `500` lỗi hệ thống

Gợi ý FE:

- Ưu tiên hiển thị `message`.
- Nếu có `errors`, render theo field hoặc dạng list.

## 6) TypeScript interfaces gợi ý

```ts
export type ConversationStatus =
  | "AiAssist"
  | "WaitingCoordinator"
  | "CoordinatorActive"
  | "Closed";

export type MessageType = "UserMessage" | "AiMessage" | "SystemMessage";

export interface VictimConversationDto {
  ConversationId: number;
  Status: ConversationStatus;
  SelectedTopic: string | null;
  LinkedSosRequestId: number | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface MessageDto {
  Id: number;
  SenderId: string | null;
  SenderName: string | null;
  Content: string | null;
  MessageType: MessageType;
  CreatedAt: string | null;
}

export interface ApiError {
  message: string;
  innerError?: string;
  errors?: Record<string, string[]>;
}
```

## 7) Checklist tích hợp nhanh

1. FE luôn attach JWT Bearer cho REST.
2. Với SignalR, truyền token qua `access_token` query string.
3. Victim screen init bằng `my-conversation`, không hard-code conversationId cũ.
4. Sau `select-topic` và/hoặc `link-sos-request`, cập nhật local state theo `Status` trả về.
5. Coordinator gọi `join` REST trước khi `JoinConversation` SignalR.
6. Khi mở chat, load lịch sử bằng `messages` rồi mới subscribe event real-time.
7. Parse lỗi theo `message` và `errors` từ middleware.
