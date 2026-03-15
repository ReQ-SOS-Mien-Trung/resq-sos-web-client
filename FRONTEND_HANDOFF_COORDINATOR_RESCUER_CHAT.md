# FRONTEND HANDOFF - Coordinator (Website) chat voi Rescuer (Mobile App)

Ngay cap nhat: 2026-03-15 (bo sung review code backend moi)

## 0) Backend moi da them chat chuc nang gi?

Sau khi review code backend hien tai, cac chuc nang chat da duoc bo sung/hoan thien gom:

1. Them full flow Victim truoc khi vao coordinator:

- `GET /operations/conversations/my-conversation`:
  - lay/tao conversation o trang thai `AiAssist`
  - tra ve `AiGreetingMessage` + `TopicSuggestions`
- `GET /operations/conversations/my-conversations`:
  - lay danh sach cac conversation cua victim
- `POST /operations/conversations/{conversationId}/select-topic`:
  - victim chon chu de ho tro
  - neu topic la `SosRequestSupport` backend tra danh sach SOS cua victim
- `POST /operations/conversations/{conversationId}/link-sos-request`:
  - victim chon SOS cu the de lien ket vao conversation

2. Trang thai conversation da ro hon:

- `AiAssist` -> `WaitingCoordinator` -> `CoordinatorActive` -> `Closed`

3. Bo sung chat event/message type day du:

- message type co 3 loai: `UserMessage`, `AiMessage`, `SystemMessage`
- coordinator join se tao system message trong room

4. Bo sung push notification qua Firebase:

- khi coordinator join: push den victim
- khi co tin nhan moi: push den tat ca participant khac nguoi gui

5. Hub + REST cho coordinator da on dinh:

- coordinator co the join qua REST (`POST /join`) hoac SignalR (`CoordinatorJoin`)
- join room SignalR bat buoc user phai la participant

## 1) Ket luan nhanh sau khi review backend hien tai

Backend hien tai CHUA co flow chinh thuc cho coordinator chat truc tiep voi rescuer.

Flow dang co trong code la:

- Victim -> AI -> Coordinator
- SignalR hub duy nhat: `/hubs/chat`
- Participant trong conversation hien tai duoc add theo cac case:
  - `Victim` (khi tao/get conversation cho victim)
  - `Coordinator` (khi coordinator join)
  - `coordinator` + `victim` (conversation tao theo mission)

Khong thay endpoint/use case nao add rescuer vao conversation trong runtime cho flow chat nay.

## 2) Ban chat website co the code ngay duoc gi (tai su dung cho coordinator)

Frontend website van co the code module chat realtime cho coordinator dua tren contract da co, va sau nay backend bo sung rescuer participant thi dung lai module nay.

### 2.1 Auth

- Hub va API deu can JWT Bearer.
- Riêng SignalR duoc backend doc token tu query string: `access_token`.
- Vi du URL hub:
  - `https://<api-host>/hubs/chat?access_token=<jwt>`

### 2.2 REST APIs lien quan chat

Base route: `/operations/conversations`

1. Victim lay/tao conversation hien tai:

- `GET /operations/conversations/my-conversation`
- Response:

```json
{
  "conversationId": 123,
  "victimId": "guid-or-null",
  "status": "AiAssist",
  "selectedTopic": "string-or-null",
  "linkedSosRequestId": 456,
  "createdAt": "2026-03-15T10:00:00Z",
  "aiGreetingMessage": "...",
  "topicSuggestions": [
    {
      "topicKey": "SosRequestSupport",
      "displayName": "...",
      "description": "..."
    }
  ],
  "participants": [
    {
      "userId": "guid-or-null",
      "userName": "string-or-null",
      "role": "Victim",
      "joinedAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

2. Victim lay lich su cac conversation:

- `GET /operations/conversations/my-conversations`
- Response item:

```json
{
  "conversationId": 123,
  "status": "WaitingCoordinator",
  "selectedTopic": "SosRequestSupport",
  "linkedSosRequestId": 456,
  "createdAt": "2026-03-15T10:00:00Z",
  "updatedAt": "2026-03-15T10:05:00Z"
}
```

3. Victim chon topic ho tro:

- `POST /operations/conversations/{conversationId}/select-topic`
- Body:

```json
{ "topicKey": "SosRequestSupport" }
```

- Response:

```json
{
  "conversationId": 123,
  "status": "WaitingCoordinator",
  "topicKey": "SosRequestSupport",
  "aiResponseMessage": "...",
  "sosRequests": [
    {
      "id": 456,
      "sosType": "Medical",
      "rawMessage": "...",
      "status": "Pending"
    }
  ]
}
```

Luu y quan trong:

- Neu topic = `SosRequestSupport` NHUNG victim khong co SOS hop le, backend se giu status `AiAssist` (chua qua cho coordinator).
- Cac topic khac se chuyen thang `WaitingCoordinator`.

4. Victim link SOS cu the vao conversation:

- `POST /operations/conversations/{conversationId}/link-sos-request`
- Body:

```json
{ "sosRequestId": 456 }
```

- Response:

```json
{
  "conversationId": 123,
  "linkedSosRequestId": 456,
  "status": "WaitingCoordinator",
  "aiConfirmationMessage": "..."
}
```

5. Lay danh sach phong dang cho coordinator:

- `GET /operations/conversations/waiting`
- Response item:

```json
{
  "conversationId": 123,
  "victimId": "guid-or-null",
  "victimName": "string-or-null",
  "selectedTopic": "string-or-null",
  "linkedSosRequestId": 456,
  "updatedAt": "2026-03-15T10:00:00Z"
}
```

6. Coordinator join phong:

- `POST /operations/conversations/{conversationId}/join`
- Response:

```json
{
  "conversationId": 123,
  "coordinatorId": "guid",
  "status": "CoordinatorActive",
  "systemMessage": "..."
}
```

7. Lay lich su tin nhan:

- `GET /operations/conversations/{conversationId}/messages?page=1&pageSize=50`
- Response:

```json
{
  "conversationId": 123,
  "page": 1,
  "pageSize": 50,
  "messages": [
    {
      "id": 1,
      "senderId": "guid-or-null",
      "senderName": "string-or-null",
      "content": "...",
      "messageType": "UserMessage",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

8. (Legacy theo mission) Lay conversation theo mission:

- `GET /operations/conversations/mission/{missionId}`
- Luu y: response hien tai model theo coordinator/victim, chua model cho rescuer.

### 2.3 SignalR methods/event contract

Hub: `/hubs/chat`

Client -> Server methods:

- `JoinConversation(conversationId: number)`
- `LeaveConversation(conversationId: number)`
- `SendMessage(conversationId: number, content: string)`
- `CoordinatorJoin(conversationId: number)`

Server -> Client events:

- `JoinedConversation`

```json
{ "conversationId": 123, "message": "Da tham gia cuoc tro chuyen." }
```

- `LeftConversation`

```json
{ "conversationId": 123 }
```

- `ReceiveMessage`

```json
{
  "id": 1,
  "conversationId": 123,
  "senderId": "guid-or-null",
  "senderName": "string-or-null",
  "content": "...",
  "messageType": "UserMessage | AiMessage | SystemMessage",
  "createdAt": "2026-03-15T10:00:00Z"
}
```

- `CoordinatorJoined`

```json
{
  "conversationId": 123,
  "coordinatorId": "guid",
  "status": "CoordinatorActive",
  "systemMessage": "..."
}
```

Luu y quan trong:

- `JoinConversation` se fail neu user khong phai participant.
- `CoordinatorJoin` trong hub co the vua add coordinator participant vua join group realtime.
- Khi coordinator join thanh cong, backend tao them 1 system message trong conversation.

- `Error`

```json
"error message string"
```

### 2.4 Trinh tu frontend de chat on dinh

1. Goi `POST /join` (hoac invoke `CoordinatorJoin`) de dam bao coordinator la participant.
2. Khoi tao ket noi SignalR voi access token.
3. Invoke `JoinConversation(conversationId)`.
4. Goi REST `GET /messages` de lay history.
5. Merge history + realtime stream (`ReceiveMessage`) theo `createdAt`.
6. Khi gui tin: invoke `SendMessage(conversationId, content)`.
7. Neu reconnect: join lai room va fetch lai 1 trang messages moi nhat de bu lech.

### 2.5 Notification behavior (de frontend align UX)

- Coordinator join conversation:
  - Backend gui push notification den victim.
- User gui message moi:
  - Backend gui push notification den cac participant con lai.
- Goi y UX:
  - Web va mobile nen co unread badge + in-app toast khi app dang foreground.

## 3) Cac khoang trong backend can chot neu muon dung bai toan Coordinator <-> Rescuer

De frontend website chat truc tiep voi rescuer app theo nghia nghiep vu, backend can bo sung toi thieu:

1. API tao/lay conversation theo cap coordinator-rescuer

- Vi du: `POST /operations/rescuer-conversations` (payload co rescuerId), tra ve conversationId.
- Hoac API `GET/POST` theo `missionId + rescuerId`.

2. API list conversation cua coordinator voi rescuer

- De website co danh sach nguoi cuu ho dang trao doi.

3. API list conversation cua rescuer tren app

- De app mobile lay danh sach room duoc coordinator lien he.

4. Logic add rescuer participant

- Tuong tu `AddCoordinatorAsync`, can co `AddRescuerAsync` (hoac generic `AddParticipantAsync`).

5. Chuan hoa role_in_conversation

- Hien dang bi tron hoa thuong/hoa (`Coordinator` vs `coordinator`, `Victim` vs `victim`).
- Nen thong nhat enum/string constant de frontend filter role khong bi sai.

6. Role authorization ro rang cho endpoint coordinator

- Mot so endpoint coordinator hien chi `[Authorize]`, chua ep role coordinator.

7. Contract role trong legacy mission endpoint

- Legacy endpoint mission dang doc role dang lowercase (`coordinator`, `victim`),
  trong khi flow moi add participant dung uppercase (`Coordinator`, `Victim`).
- Can thong nhat truoc khi frontend filter role theo string.

## 4) De xuat implementation cho frontend website (coordinator) ngay bay gio

Trong luc cho backend bo sung flow rescuer, team web co the code xong 90% module:

- Tao `ChatTransportService` (SignalR connect/reconnect/invoke/on/off).
- Tao `ConversationApiService` (waiting/join/messages).
- Tao `CoordinatorChatStore`:
  - state: activeConversationId, messages, connectionState, error
  - action: loadWaitingRooms, joinRoom, loadHistory, sendMessage
- UI:
  - cot trai: danh sach room cho
  - cot phai: thread + input
  - badge status: WaitingCoordinator / CoordinatorActive

Khi backend bo sung coordinator-rescuer conversation, frontend chi can doi API lay room (nguon conversationId) va metadata participant.

## 5) Mau pseudo-code ket noi SignalR cho frontend web

```ts
import * as signalR from "@microsoft/signalr";

export function createChatConnection(apiBaseUrl: string, token: string) {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${apiBaseUrl}/hubs/chat`, {
      accessTokenFactory: () => token,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect()
    .build();
}

// usage
await connection.start();
await connection.invoke("JoinConversation", conversationId);

connection.on("ReceiveMessage", (msg) => {
  // append to UI store
});

await connection.invoke("SendMessage", conversationId, content);
```

## 6) Note quan trong cho QA

- Thu voi token coordinator va user khong phai participant de xac nhan backend tra `Error`/403 dung.
- Thu reconnect mang yeu de dam bao khong mat tin nhan moi.
- Thu pagination messages voi room co > 200 messages.

---

Neu can, backend co the tao them 1 file OpenAPI mini rieng cho flow coordinator-rescuer de frontend tich hop nhanh hon.
