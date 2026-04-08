import type { ChatRoom, MessageTemplate, AutoReplyRule } from "@/types/admin-pages";

export const mockChatRooms: ChatRoom[] = [
  {
    id: "1",
    name: "Phòng chat hỗ trợ chung",
    type: "public",
    status: "active",
    participants: 156,
    lastMessage: "Cảm ơn bạn đã liên hệ!",
    lastMessageAt: "2024-12-20T10:30:00Z",
    settings: {
      autoReply: true,
      maxParticipants: 500,
      allowFileUpload: true,
      moderation: true,
    },
  },
  {
    id: "2",
    name: "Hỗ trợ cứu hộ viên",
    type: "private",
    status: "active",
    participants: 45,
    lastMessage: "Tài liệu đã được gửi",
    lastMessageAt: "2024-12-20T09:15:00Z",
    settings: {
      autoReply: false,
      maxParticipants: 100,
      allowFileUpload: true,
      moderation: true,
    },
  },
  {
    id: "3",
    name: "Hỗ trợ khẩn cấp",
    type: "support",
    status: "active",
    participants: 23,
    lastMessage: "Đang xử lý yêu cầu của bạn...",
    lastMessageAt: "2024-12-20T10:45:00Z",
    settings: {
      autoReply: true,
      allowFileUpload: false,
      moderation: true,
    },
  },
  {
    id: "4",
    name: "Phòng chat cộng đồng",
    type: "public",
    status: "inactive",
    participants: 0,
    settings: {
      autoReply: false,
      maxParticipants: 1000,
      allowFileUpload: true,
      moderation: false,
    },
  },
];

export const mockMessageTemplates: MessageTemplate[] = [
  {
    id: "1",
    name: "Chào hỏi",
    content: "Xin chào! Tôi là {botName}. Tôi có thể giúp gì cho bạn?",
    category: "greeting",
    variables: ["botName"],
  },
  {
    id: "2",
    name: "Phản hồi yêu cầu cứu hộ",
    content: "Cảm ơn bạn đã báo cáo. Chúng tôi đang xử lý yêu cầu của bạn. Vui lòng cung cấp thêm thông tin: {info}",
    category: "response",
    variables: ["info"],
  },
  {
    id: "3",
    name: "Chuyển tiếp cho nhân viên",
    content: "Yêu cầu của bạn đã được chuyển đến {department}. Nhân viên sẽ liên hệ với bạn sớm nhất có thể.",
    category: "escalation",
    variables: ["department"],
  },
  {
    id: "4",
    name: "Kết thúc cuộc trò chuyện",
    content: "Cảm ơn bạn đã sử dụng dịch vụ. Nếu cần hỗ trợ thêm, vui lòng liên hệ lại. Chúc bạn một ngày tốt lành!",
    category: "closing",
  },
];

export const mockAutoReplyRules: AutoReplyRule[] = [
  {
    id: "1",
    trigger: "cứu hộ|sos|khẩn cấp",
    response: "Chúng tôi đã nhận được yêu cầu khẩn cấp của bạn. Đang chuyển đến đội cứu hộ...",
    priority: 1,
    enabled: true,
  },
  {
    id: "2",
    trigger: "đăng ký|registration",
    response: "Để đăng ký làm cứu hộ viên, vui lòng truy cập: {registrationLink}",
    priority: 2,
    enabled: true,
  },
  {
    id: "3",
    trigger: "thời tiết|weather",
    response: "Thông tin thời tiết mới nhất: {weatherLink}",
    priority: 3,
    enabled: true,
  },
];
