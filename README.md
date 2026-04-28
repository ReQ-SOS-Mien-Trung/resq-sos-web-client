# ResQ SOS Web Client - Capstone Project

Dự án Hệ thống Hỗ trợ Cứu hộ và Điều phối Khẩn cấp (ResQ SOS) - Phần Giao diện Người dùng (Frontend).

## 1. Công nghệ sử dụng (Third-party Libraries & Frameworks)

Dự án được xây dựng dựa trên các công nghệ hiện đại sau:

- **Framework chính:** Next.js 16 (App Router), React 19.
- **Ngôn ngữ:** TypeScript.
- **Styling:** Tailwind CSS 4, Lucide Icons, Phosphor Icons.
- **Bản đồ & GIS:** Leaflet, Goong Maps (@goongmaps/goong-js), Mapbox GL.
- **Quản lý trạng thái:** Zustand, Tanstack Query (React Query).
- **Giao tiếp API:** Axios, SignalR (Real-time Communication).
- **UI Components:** Radix UI, Framer Motion, GSAP (Animations).
- **Tiện ích:** Date-fns, XLSX, Recharts, Chart.js.

## 2. Hướng dẫn cài đặt (Installation Guide)

Đảm bảo bạn đã cài đặt Node.js (phiên bản 18+ hoặc 20+).

### Bước 1: Cài đặt thư viện

```bash
npm install
```

### Bước 2: Cấu hình môi trường

Tạo file `.env` từ file `.env.example` và điền đầy đủ các API Keys cần thiết.

### Bước 3: Chạy môi trường phát triển

```bash
npm run dev
```

Truy cập hệ thống tại: `http://localhost:3000`

### Bước 4: Build sản phẩm

```bash
npm run build
npm run start
```

## 3. Cấu hình hệ thống (System Configuration)

### Các biến môi trường chính (.env)

- `NEXT_PUBLIC_BASE_URL`: URL API của Backend hệ thống.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: ID dùng cho đăng nhập Google.

* **Dịch vụ Bản đồ:**
  - `NEXT_PUBLIC_GOONG_MAPTILES_KEY` & `GOONG_API_KEY`: Dùng cho Goong Maps API.
* **Dịch vụ Cloud & Real-time:**
  - `NEXT_PUBLIC_FIREBASE_*`: Cấu hình Firebase cho thông báo đẩy (Notifications).
  - `NEXT_PUBLIC_CLOUDINARY_*`: Dùng cho lưu trữ hình ảnh/video.
* **Dịch vụ Thời tiết:**
  - `NEXT_PUBLIC_WINDY_API_KEY`, `WEATHERAPI_KEY`.

## 4. Tài khoản Demo (Demo Accounts)

Hệ thống hỗ trợ các loại phân quyền sau. Dưới đây là thông tin tài khoản dùng cho mục đích kiểm thử (Demo):

| Role              | Username / Email | Password        | Ghi chú                    |
| :---------------- | :--------------- | :-------------- | :------------------------- |
| **Admin**         | admin            | Admin@123       | Quản lý hệ thống toàn diện |
| **Coordinator**   | coord03          | Coordinator@123 | Điều phối viên cứu hộ      |
| **Depot Manager** | manager01        | Manager@123     | Quản lí kho                |

## 5. Cấu trúc Source Code

- `/app`: Chứa các trang (pages), layouts và routing của Next.js.
- `/components`: Các thành phần giao diện dùng chung (UI/UX).
- `/services`: Các hàm gọi API và giao tiếp với Backend.
- `/stores`: Quản lý trạng thái ứng dụng (Zustand).
- `/hooks`: Các React hooks tùy chỉnh cho xử lý logic.
- `/public`: Chứa tài nguyên tĩnh (hình ảnh, icons).
- `/config`: Cấu hình các thư viện bên thứ 3 (Axios, Firebase...).

---

_Dự án thuộc Bộ môn Kỹ thuật phần mềm - Capstone Project submission._
