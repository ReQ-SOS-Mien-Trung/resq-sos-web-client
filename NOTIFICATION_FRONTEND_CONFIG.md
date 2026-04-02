# RESQ Backend Notification Config for Website

Updated: 2026-04-02

## 1) Requested counts (Coordinator, Manager, Admin)

### 1.1 Persisted notification types

Persisted notification means: saved to `notifications` + `user_notifications`, available via `GET /notifications`, and pushed real-time to SignalR event `ReceiveNotification`.

- Coordinator (role_id = 2): **1 type**
- Manager (role_id = 4): **11 types**
- Admin (role_id = 1): **0 direct types**

Total unique persisted types for these 3 roles: **12**.

### 1.2 Broadcast topic channel (non-persisted)

Broadcast alert uses FCM topic `all_users`, so all roles can receive if frontend registers FCM token.

- Coordinator: +1 broadcast channel
- Manager: +1 broadcast channel
- Admin: +1 broadcast channel

Broadcast is **not** written to `notifications` table and **not** pushed by `ReceiveNotification` SignalR event.

## 2) Notification type matrix by role

## Manager (role_id = 4) - 11 persisted types

| Type                               | Trigger summary                                             |
| ---------------------------------- | ----------------------------------------------------------- |
| `fund_allocation`                  | Admin allocates campaign fund to depot.                     |
| `supply_request`                   | New supply request received by source depot manager.        |
| `supply_request_urgent`            | New urgent supply request received.                         |
| `supply_request_high_escalation`   | Pending request reached high escalation threshold.          |
| `supply_request_urgent_escalation` | Pending request reached urgent escalation threshold.        |
| `supply_request_auto_rejected`     | Request was auto-rejected due to timeout.                   |
| `supply_accepted`                  | Source depot accepted request (sent to requesting manager). |
| `supply_rejected`                  | Source depot rejected request (sent to requesting manager). |
| `supply_preparing`                 | Source depot started preparing goods.                       |
| `supply_shipped`                   | Goods are shipped to requesting depot.                      |
| `supply_completed`                 | Source depot marked delivery complete.                      |

## Coordinator (role_id = 2) - 1 persisted type

| Type           | Trigger summary                                                                             |
| -------------- | ------------------------------------------------------------------------------------------- |
| `chat_message` | New chat message from another participant in conversation (usually victim <-> coordinator). |

## Admin (role_id = 1) - 0 persisted direct types

No direct `SendNotificationToUserAsync` flow currently targets admin-only users.

## Cross-role broadcast (Coordinator/Manager/Admin)

| Channel               | Type                                                             |
| --------------------- | ---------------------------------------------------------------- |
| FCM topic `all_users` | Dynamic from `active_alerts[0].eventType`, default `flood_alert` |

## 3) Existing data snapshot in current fresh Docker DB

Query time: 2026-04-02

- Admin (role_id = 1): 0 notifications
- Coordinator (role_id = 2): 0 notifications
- Manager (role_id = 4): 1 notification
  - `supply_request_auto_rejected`: 1

Note: This is current seeded/runtime data count, not the full capability count.

## 4) Website integration contract

## 4.1 REST endpoints

- `GET /notifications?page=1&pageSize=20`
  - Returns: `items`, `totalCount`, `page`, `pageSize`, `unreadCount`
- `PATCH /notifications/{userNotificationId}/read`
- `PATCH /notifications/read-all`
- `POST /notifications/broadcast` (admin permission `system.config.manage`)

## 4.2 SignalR hubs

- Notification hub: `/hubs/notifications`
  - Main event: `ReceiveNotification`
  - Payload shape:

```json
{
  "userNotificationId": 123,
  "title": "Yeu cau tiep te khan cap",
  "type": "supply_request_urgent",
  "body": "Yeu cau #15 da vao muc khan cap...",
  "isRead": false,
  "createdAt": "2026-04-02T10:00:00Z"
}
```

- Chat hub: `/hubs/chat`
  - Real-time room events (not notification feed): `ReceiveMessage`, `CoordinatorJoined`, `CoordinatorLeft`

- Dashboard hub: `/hubs/dashboard`
  - Admin dashboard event: `ReceiveVictimsByPeriod`
  - This is dashboard data push, not notification feed item.

All hubs accept JWT via query string `?access_token=...`.

## 4.3 FCM token registration for web push

- `POST /identity/user/me/fcm-token`
- `DELETE /identity/user/me/fcm-token`
- Request body:

```json
{
  "token": "<browser_fcm_token>"
}
```

Without this step, user-specific topic push and `all_users` broadcast push will not reach browser device.

## 5) Type notes to avoid frontend confusion

- `coordinator_join` and `coordinator_leave` exist, but they are sent to victim when coordinator joins/leaves chat.
- `team_assigned`, `assembly_gathering`, `assembly_point_assignment` are rescuer-oriented types.
- Broadcast alert does not appear in `/notifications` list unless backend later adds persistence for topic sends.

## 6) Suggested frontend role map

- role_id 1: Admin
- role_id 2: Coordinator
- role_id 4: Manager

Use `GET /identity/user/me` to read `roleId` and `permissions` for UI gating.
