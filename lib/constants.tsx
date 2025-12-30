export type SOSItem = {
  image: string;
  title: string;
  slug: string;
  location: string;
  date: string; // e.g., "2025-11-07"
  time: string; // e.g., "09:00 AM"
};

export const SOSs: SOSItem[] = [
  {
    image: "/images/flood-relief-qb.png",
    title: "Cứu trợ khẩn cấp Lệ Thủy - Quảng Bình",
    slug: "cuu-tro-khan-cap-le-thuy-quang-binh",
    location: "Huyện Lệ Thủy, Quảng Bình",
    date: "2025-10-15",
    time: "07:30 AM",
  },
  {
    image: "/images/rescue-ht.png",
    title: "Đội cứu hộ tiếp cận vùng ngập sâu Hương Khê",
    slug: "doi-cuu-ho-tiep-can-huong-khe",
    location: "Huyện Hương Khê, Hà Tĩnh",
    date: "2025-10-16",
    time: "09:00 AM",
  },
  {
    image: "/images/supplies-qt.png",
    title: "Phân phát nhu yếu phẩm xã Hải Lăng",
    slug: "phan-phat-nhu-yeu-pham-hai-lang",
    location: "Huyện Hải Lăng, Quảng Trị",
    date: "2025-10-18",
    time: "08:30 AM",
  },
  {
    image: "/images/training-hue.png",
    title: "Tập huấn kỹ năng sơ cấp cứu tình nguyện viên",
    slug: "tap-huan-ky-nang-so-cap-cuu",
    location: "TP. Huế, Thừa Thiên Huế",
    date: "2025-09-20",
    time: "02:00 PM",
  },
  {
    image: "/images/charity-dn.png",
    title: "Chiến dịch gom áo ấm mùa đông",
    slug: "chien-dich-gom-ao-am-mua-dong",
    location: "TP. Đà Nẵng",
    date: "2025-11-01",
    time: "08:00 AM",
  },
  {
    image: "/images/evacuation-qnam.png",
    title: "Sơ tán người dân vùng sạt lở Nam Trà My",
    slug: "so-tan-nguoi-dan-nam-tra-my",
    location: "Huyện Nam Trà My, Quảng Nam",
    date: "2025-10-25",
    time: "10:00 AM",
  },
  {
    image: "/images/medical-qngai.png",
    title: "Khám chữa bệnh miễn phí sau bão",
    slug: "kham-chua-benh-mien-phi-sau-bao",
    location: "Huyện Bình Sơn, Quảng Ngãi",
    date: "2025-11-05",
    time: "07:00 AM",
  },
];

export default SOSs;
