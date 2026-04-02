# Hướng dẫn Test Luồng Cứu hộ Cứu trợ

> **Môi trường:** Seed data đã được apply vào DB. Ngày hệ thống: **01/04/2026**

---

## Tài khoản Test

| Vai trò | Username | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | `admin` | `Admin@123` | Quản trị toàn hệ thống |
| Coordinator | `coordinator` | `Coordinator@123` | Điều phối cứu hộ |
| Rescuer (đội trưởng) | `rescuer` | `Rescuer@123` | Đội trưởng, đang trong Mission #1 |
| Victim | `victim` | `Victim@123` | Đã gửi SOS #1, #6 |
| Nạn nhân 2 | `0961111111` | `Victim@123` | Đã gửi SOS #2 |
| Nạn nhân 3 | `0962222222` | `Victim@123` | Đã gửi SOS #3 |
| Nạn nhân 4 | `0963333333` | `Victim@123` | Đã gửi SOS #4, #7 |
| Nạn nhân 5 | `0964444444` | `Victim@123` | Đã gửi SOS #5, #8 |

### Tài khoản Rescuer — Volunteer (đang trong Mission)

> Tất cả rescuer dùng mật khẩu `Rescuer@123`

| Username | Loại | Vai trò trong Mission | Scenario |
|---|---|---|---|
| `rescuer21` | **Volunteer** | Member — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer23` | **Volunteer** | Member — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer7` | **Volunteer** | Leader — MissionTeam #2 (đã hoàn thành) | Scenario 4 |
| `rescuer9` | **Volunteer** | Member — MissionTeam #2 (đã hoàn thành) | Scenario 4 |
| `rescuer11` | **Volunteer** | Member — MissionTeam #2 (đã hoàn thành) | Scenario 4 |

### Tài khoản Rescuer — Core (đang trong Mission)

| Username | Loại | Vai trò trong Mission | Scenario |
|---|---|---|---|
| `rescuer` | **Core** | Leader — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer20` | **Core** | Member — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer22` | **Core** | Member — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer24` | **Core** | Member — MissionTeam #1 (đang diễn ra) | Scenario 3 |
| `rescuer8` | **Core** | Member — MissionTeam #2 (đã hoàn thành) | Scenario 4 |
| `rescuer10` | **Core** | Member — MissionTeam #2 (đã hoàn thành) | Scenario 4 |
| `rescuer12` | **Core** | Member — MissionTeam #2 (đã hoàn thành) | Scenario 4 |

---

## Tổng quan 4 Scenario

| # | Tên | Trạng thái | SOS | Cluster | Mission |
|---|---|---|---|---|---|
| 1 | SOS mới đến | `Pending` | #6 | Chưa có | Chưa có |
| 2 | Cluster chờ Mission | `Assigned` | #3, #4 | #3 (Hà Tĩnh) | Chưa có |
| 3 | Mission đang diễn ra | `InProgress` | #1, #2 | #1 (Huế) | #1 OnGoing |
| 4 | Mission hoàn thành | `Resolved` | #7, #8 | #4 (Phong Điền) | #3 Completed |

---

## Scenario 1 — SOS mới đến, chưa xử lý

**Mô tả:** SOS #6 vừa được gửi lúc 06:40 hôm nay (01/04/2026), chưa có cluster, chưa có coordinator review. Đây là điểm khởi đầu toàn bộ luồng.

### Trạng thái DB

| Trường | Giá trị |
|---|---|
| SOS #6 Status | `Pending` |
| ClusterId | `null` |
| Vị trí | Phong Điền, Huế (107.583, 16.466) |
| Người gửi | victim / 0945678901 |
| Nội dung | 4 người, 2 cụ già không di chuyển được, nước lũ đang lên |
| Priority | `High` |
| Thời gian | 01/04/2026 13:40 (giờ VN) |

### Các bước test

1. Đăng nhập **Coordinator** → vào màn hình danh sách SOS
2. SOS #6 phải xuất hiện **đầu danh sách** (mới nhất, badge `Pending`)
3. Xem chi tiết SOS #6 → kiểm tra thông tin nạn nhân, vị trí bản đồ, AI analysis
4. **Review SOS** → đánh dấu đã xem / gom vào cluster mới
5. Sau khi gom cluster → kiểm tra SOS #6 chuyển sang `Assigned`
6. Đăng nhập **Victim** → màn hình theo dõi SOS phải cập nhật trạng thái đúng

---

## Scenario 2 — Cluster đã hình thành, chờ tạo Mission

**Mô tả:** SOS #3 và #4 tại Hà Tĩnh đã được gom vào Cluster #3. Cluster chưa có mission (`IsMissionCreated = false`). Coordinator cần chỉ định đội cứu hộ để tạo mission.

### Trạng thái DB

| Đối tượng | Trạng thái | Chi tiết |
|---|---|---|
| SOS #3 | `Assigned`, ClusterId=3 | Sạt lở đường, 5 người, 2 bị thương (gãy tay + chảy máu đầu) |
| SOS #4 | `Assigned`, ClusterId=3 | Cả thôn cô lập 3 ngày, 120 người, hết lương thực và thuốc |
| Cluster #3 | `IsMissionCreated = false` | Hà Tĩnh (105.901, 18.350), 85 nạn nhân ước tính, mức độ High |

### Các bước test

1. Đăng nhập **Coordinator** → vào màn hình Cluster
2. Cluster #3 phải hiện trạng thái **"Chờ tạo mission"** / chưa có mission
3. Xem 2 SOS trong cluster (SOS #3, #4), kiểm tra nội dung và mức độ ưu tiên
4. **Tạo Mission** → gán đội cứu hộ, thêm hoạt động → submit
5. Kiểm tra `IsMissionCreated` chuyển thành `true` trên Cluster #3
6. Kiểm tra SOS #3, #4 chuyển sang `InProgress`

---

## Scenario 3 — Mission đang diễn ra

**Mô tả:** Mission #1 tại Huế đang `OnGoing`. Đội cứu hộ (MissionTeam #1) đang `InProgress` — gồm đội trưởng `rescuer` và 5 thành viên. Có 2 hoạt động: #1 đang chạy, #3 chờ bắt đầu. Có 1 sự cố đội đã báo cáo.

### Trạng thái DB

| Đối tượng | Trạng thái | Chi tiết |
|---|---|---|
| Mission #1 | `OnGoing` | Cluster #1, Huế, ưu tiên Critical |
| SOS #1 | `InProgress` | Cụ bà 82t liệt nửa người, 3 người, nước lên nhanh *(Critical)* |
| SOS #2 | `InProgress` | Phụ nữ mang thai tháng 8 + 3 trẻ nhỏ trú trên mái *(Critical)* |
| MissionTeam #1 | `InProgress` | Biệt đội Ca nô Hà Tĩnh, đội trưởng = `rescuer` |
| Thành viên đội | 6 người | rescuer (Leader) + rescuer20, 21, 22, 23, 24 |
| MissionActivity #1 | `OnGoing` | EVACUATE — Tiếp cận khu ngập, di tản |
| MissionActivity #3 | `Planned` | MEDICAL_SUPPORT — Sơ cứu cụ bà 82t và phụ nữ mang thai |
| TeamIncident #1 | `Reported` | Thuyền hỏng động cơ |
| Conversation #1 | — | Chat Mission #1, có tin nhắn mẫu từ rescuer |

### Cấu trúc đội (MissionTeam #1)

| Username | Loại | Vai trò |
|---|---|---|
| `rescuer` | Core | Leader |
| `rescuer20` | Core | Member |
| `rescuer21` | **Volunteer** | Member |
| `rescuer22` | Core | Member |
| `rescuer23` | **Volunteer** | Member |
| `rescuer24` | Core | Member |

### Các bước test

1. Đăng nhập **Rescuer** (Core Leader) → vào màn hình nhiệm vụ đang thực hiện → Mission #1 phải hiện
2. Xem danh sách thành viên đội — phân biệt được Core vs Volunteer
3. Xem 2 hoạt động: #1 `OnGoing`, #3 `Planned`
4. **Cập nhật hoạt động #1** → chuyển sang `Succeed`
5. **Bắt đầu hoạt động #3** → chuyển sang `OnGoing`
6. Xem sự cố đội (TeamIncident #1 — thuyền hỏng động cơ)
7. Mở **Chat** của Mission #1 → kiểm tra tin nhắn mẫu và gửi thêm tin nhắn mới
8. Đăng nhập **rescuer21** hoặc **rescuer23** (Volunteer Member) → kiểm tra giao diện member thấy nhiệm vụ và chat
9. Đăng nhập **Coordinator** → xem dashboard Mission #1, kiểm tra cập nhật real-time

---

## Scenario 4 — Mission đã hoàn thành, có báo cáo đầy đủ

**Mô tả:** Mission #3 tại Phong Điền, Huế đã `Completed`. Đội y tế (MissionTeam #2) đã `Reported`. Báo cáo đã `Submitted`. Đây là luồng kết thúc đầy đủ nhất để kiểm tra màn hình lịch sử và báo cáo.

### Trạng thái DB

| Đối tượng | Trạng thái | Chi tiết |
|---|---|---|
| Mission #3 | `Completed` | Cluster #4, Phong Điền — hoàn thành lúc 01/03/2026 20:30 (VN) |
| SOS #7 | `Resolved` | 7 người (3 trẻ em, 1 cụ già), Phong Điền |
| SOS #8 | `Resolved` | 3 người, có người bị thương nhẹ do leo mái, Phong Điền |
| MissionTeam #2 | `Reported` | Đội Y tế Huế, đội trưởng = rescuer07 |
| MissionActivity #4 | `Succeed` | EVACUATE — Di tản 10 người ra điểm tập kết |
| MissionActivity #5 | `Succeed` | MEDICAL_SUPPORT — Sơ cứu 3 người, chuyển 1 ca nặng |
| MissionTeamReport #1 | `Submitted` | Kết quả: `rescued: 10, treated: 3, referred: 1` |
| ActivityReport #1 | `Succeed` | Báo cáo hoạt động EVACUATE |
| ActivityReport #2 | `Succeed` | Báo cáo hoạt động MEDICAL_SUPPORT |

### Cấu trúc đội (MissionTeam #2)

| Username | Loại | Vai trò |
|---|---|---|
| `rescuer7` | **Volunteer** | Leader (đã submit báo cáo) |
| `rescuer8` | Core | Member |
| `rescuer9` | **Volunteer** | Member |
| `rescuer10` | Core | Member |
| `rescuer11` | **Volunteer** | Member |
| `rescuer12` | Core | Member |

### Các bước test

1. Đăng nhập **Coordinator** / **Admin** → vào lịch sử Mission → Mission #3 hiện `Completed`
2. Xem chi tiết: thời gian bắt đầu 01/03/2026 15:00 VN → kết thúc 20:30 VN
3. Xem **Báo cáo đội** (MissionTeamReport #1):
   - Tóm tắt: *"Di tản 10 người, sơ cứu 3 người bị thương"*
   - Kết quả JSON: `{"rescued": 10, "treated": 3, "referred": 1}`
4. Xem **Báo cáo từng hoạt động** (#1: Evacuate, #2: Medical — cả 2 Succeed)
5. Kiểm tra SOS #7, #8 hiện `Resolved` — liên kết về SOS gốc
6. Đăng nhập **rescuer7** (Volunteer Leader) → màn hình lịch sử nhiệm vụ có Mission #3, báo cáo đã submitted
7. Đăng nhập **rescuer9** hoặc **rescuer11** (Volunteer Member) → kiểm tra giao diện member xem lịch sử nhiệm vụ đã hoàn thành

---

## Lưu ý kỹ thuật

### Múi giờ
- Tất cả `CreatedAt` trong DB là **UTC**
- Frontend cộng **+7 giờ** để hiển thị giờ Việt Nam
- Ví dụ: SOS #6 `CreatedAt = 2026-04-01 06:40 UTC` → hiển thị **01/04/2026 13:40**

### Bản đồ
- Tọa độ theo chuẩn **GeoJSON**: `[longitude, latitude]`
- Các điểm SOS đều nằm trong vùng miền Trung Việt Nam (Huế, Đà Nẵng, Hà Tĩnh)

### Thứ tự danh sách SOS
- Sort theo `CreatedAt` giảm dần → SOS #6 (01/04/2026) xuất hiện **đầu tiên**
- SOS #1 (10/2025) xuất hiện cuối danh sách active

### Reset DB sạch (nếu cần)
```bash
# Dùng Docker — reset toàn bộ về seed data ban đầu
docker compose down -v
docker compose up
```

```bash
# Dùng local dotnet EF
dotnet ef database update --project RESQ.Infrastructure --startup-project RESQ.Presentation
```
