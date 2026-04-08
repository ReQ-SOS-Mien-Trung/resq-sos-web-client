"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  CheckCircle,
  CaretLeft,
  CaretDown,
  MapPin,
  X,
  Image as ImageIcon,
  UploadSimple,
  Trash,
  Eye,
  EyeSlash,
  Spinner,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/utils/uploadFile";
import { useAdminCreateUser } from "@/services/user/hooks";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth.store";

export default function CreateUserPage() {
  const router = useRouter();
  const createUserMutation = useAdminCreateUser();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    roleId: "3", // default to rescuer (3)
    address: "",
    ward: "",
    city: "",
  });

  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>(
    [],
  );
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<
    number | null
  >(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch provinces on mount
  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/v2/")
      .then((r) => r.json())
      .then((data) => setProvinces(data))
      .catch(() => { });
  }, []);

  // Fetch wards when province changes
  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }
    fetch(
      `https://provinces.open-api.vn/api/v2/p/${selectedProvinceCode}?depth=2`,
    )
      .then((r) => r.json())
      .then((data) => setWards(data.wards || []))
      .catch(() => { });
  }, [selectedProvinceCode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target as Node)
      )
        setCityOpen(false);
      if (
        wardDropdownRef.current &&
        !wardDropdownRef.current.contains(e.target as Node)
      )
        setWardOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearLocation = () => {
    setFormData((prev) => ({
      ...prev,
      address: "",
      ward: "",
      city: "",
    }));
    setSelectedProvinceCode(null);
    setWards([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const val = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: val }));
      if (val.length > 0) {
        if (val[0] !== "0") {
          setPhoneError("Số điện thoại phải bắt đầu bằng số 0.");
        } else if (val.length < 10) {
          setPhoneError("Số điện thoại phải đủ 10 số.");
        } else {
          setPhoneError("");
        }
      } else {
        setPhoneError("");
      }
    } else if (name === "email") {
      setFormData((prev) => ({ ...prev, email: value }));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value.length > 0 && !emailRegex.test(value)) {
        setEmailError("Email không đúng định dạng.");
      } else {
        setEmailError("");
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, roleId: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.username ||
      !formData.email ||
      !formData.phone ||
      !formData.password
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (formData.phone.length < 10 || formData.phone[0] !== "0") {
      toast.error("Số điện thoại không hợp lệ");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Email không hợp lệ");
      return;
    }

    const proceedWithCreation = (uploadedUrl?: string) => {
      toast.loading("Đang tạo tài khoản...");

      const payload: any = {
        ...formData,
        roleId: parseInt(formData.roleId, 10),
        province: formData.city,
        avatarUrl: uploadedUrl || undefined,
      };

      // If Rescuer, append specific values
      if (formData.roleId === "3") {
        payload.rescuerType = "core";
        payload.latitude = 0;
        payload.longitude = 0;
        payload.isEmailVerified = true;
        payload.isOnboarded = true;
        payload.isEligibleRescuer = true;

        if (user?.userId) {
          payload.approvedBy = user.userId;
          payload.approvedAt = new Date().toISOString();
        }
      }

      createUserMutation.mutate(payload, {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Tạo tài khoản thành công!");
          router.push("/dashboard/admin/users");
        },
        onError: (err: any) => {
          toast.dismiss();
          const msg =
            err?.response?.data?.message || err.message || "Đã xảy ra lỗi!";
          toast.error("Không thể tạo tài khoản: " + msg);
        },
      });
    };

    if (avatarFile) {
      setIsUploading(true);
      toast.loading("Đang tải ảnh lên hệ thống...");
      uploadImageToCloudinary(avatarFile)
        .then((url) => {
          toast.dismiss();
          setIsUploading(false);
          proceedWithCreation(url);
        })
        .catch(() => {
          toast.dismiss();
          setIsUploading(false);
          toast.error(
            "Tải ảnh thất bại, vui lòng kiểm tra lại ảnh hoặc kết nối mạng!",
          );
        });
    } else {
      proceedWithCreation();
    }
  };

  const isFormValid =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.username.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.phone.trim().length > 0 &&
    formData.password.trim().length > 0 &&
    !phoneError &&
    !emailError;

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Header & Back Action */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/admin/users")}
            className="gap-1.5 mb-4 -ml-2 text-muted-foreground hover:text-foreground tracking-tighter"
          >
            <CaretLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-foreground leading-tight flex items-center gap-3">
                <UserPlus size={32} weight="bold" />
                Tạo người dùng mới
              </h1>
              <p className="text-base font-medium text-muted-foreground mt-1 leading-relaxed tracking-tighter">
                Điền thông tin bên dưới để cấp phát tài khoản truy cập hệ thống.
              </p>
            </div>

            <Button
              type="submit"
              form="create-user-form"
              disabled={!isFormValid || createUserMutation.isPending || isUploading}
              className="gap-2 tracking-tighter shrink-0"
            >
              {createUserMutation.isPending || isUploading ? (
                <>
                  <Spinner className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Xác nhận khởi tạo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Form */}
        <form id="create-user-form" onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-5">
            {/* THÔNG TIN CÁ NHÂN */}
            <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
              <p className="text-sm font-semibold text-primary mb-0.5 tracking-tighter">
                Mục I
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tighter">
                Thông tin cá nhân
              </h2>
              <p className="text-base text-muted-foreground mt-1 leading-relaxed tracking-tighter">
                Họ tên và thông tin cơ bản liên lạc của người dùng mới.
              </p>
            </div>

            <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4">
              <div className="flex flex-col xl:flex-row gap-8">
                {/* Left Column: Info Fields */}
                <div className="flex-1 max-w-lg space-y-5">
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Họ <span className="text-primary">*</span>
                        </label>
                        <Input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Nguyễn Văn"
                          className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground tracking-tighter"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Tên <span className="text-primary">*</span>
                        </label>
                        <Input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="A"
                          className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground tracking-tighter"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5 flex flex-col justify-start">
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Số điện thoại <span className="text-primary">*</span>
                        </label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="0912345678"
                          className={`h-11 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 tracking-tighter focus-visible:ring-0 ${phoneError ? "border-red-500 focus-visible:border-red-500 text-red-500" : "border-border/60 focus-visible:border-foreground"}`}
                        />
                        {phoneError && (
                          <span className="text-sm text-red-500 font-medium leading-none mt-1 tracking-tighter">
                            {phoneError}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-start">
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Email <span className="text-primary">*</span>
                        </label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="example@resq.com"
                          className={`h-11 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 tracking-tighter focus-visible:ring-0 ${emailError ? "border-red-500 focus-visible:border-red-500 text-red-500" : "border-border/60 focus-visible:border-foreground"}`}
                        />
                        {emailError && (
                          <span className="text-sm text-red-500 font-medium leading-none mt-1 tracking-tighter">
                            {emailError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Address Layout */}
                  <div className="space-y-4 max-w-lg">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-semibold text-foreground tracking-tighter">
                        Địa chỉ
                      </label>
                      {(formData.address || formData.city) && (
                        <button
                          type="button"
                          onClick={handleClearLocation}
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-tighter"
                        >
                          <X className="w-3.5 h-3.5" />
                          Xóa toàn bộ
                        </button>
                      )}
                    </div>

                    {/* Address (Street) */}
                    <div className="relative">
                      <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Số nhà, tên đường"
                        className="h-11 pl-8 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent tracking-tighter focus-visible:ring-0 focus-visible:border-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* City/Province */}
                      <div className="relative space-y-1.5" ref={cityDropdownRef}>
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Tỉnh/Thành phố
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={citySearch || formData.city}
                            onChange={(e) => {
                              setCitySearch(e.target.value);
                              setCityOpen(true);
                              setFormData((prev) => ({
                                ...prev,
                                city: "",
                                ward: "",
                              }));
                              setSelectedProvinceCode(null);
                              setWards([]);
                            }}
                            onFocus={() => {
                              setCityOpen(true);
                              setCitySearch("");
                            }}
                            placeholder="Chọn tỉnh/thành phố"
                            readOnly={!!formData.city && !cityOpen}
                            className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 pr-8 tracking-tighter focus-visible:ring-0 focus-visible:border-foreground cursor-pointer"
                          />
                          <CaretDown
                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform pointer-events-none ${cityOpen ? "rotate-180" : ""}`}
                          />
                        </div>
                        {cityOpen && (
                          <div
                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto"
                            style={{ maxHeight: "220px" }}
                          >
                            {provinces.length === 0 && (
                              <p className="text-sm text-muted-foreground px-4 py-3 text-center tracking-tighter">
                                Đang tải...
                              </p>
                            )}
                            {provinces
                              .filter((p) =>
                                p.name
                                  .toLowerCase()
                                  .includes((citySearch || "").toLowerCase()),
                              )
                              .map((p) => (
                                <button
                                  key={p.code}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      city: p.name,
                                      ward: "",
                                    }));
                                    setSelectedProvinceCode(p.code);
                                    setWards([]);
                                    setCityOpen(false);
                                    setCitySearch("");
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm tracking-tighter hover:bg-muted/50 transition-colors ${formData.city === p.name
                                    ? "bg-primary/5 text-primary font-bold"
                                    : ""
                                    }`}
                                >
                                  {p.name}
                                </button>
                              ))}
                            {provinces.length > 0 &&
                              provinces.filter((p) =>
                                p.name
                                  .toLowerCase()
                                  .includes((citySearch || "").toLowerCase()),
                              ).length === 0 && (
                                <p className="text-sm text-muted-foreground px-4 py-3 text-center tracking-tighter">
                                  Không tìm thấy
                                </p>
                              )}
                          </div>
                        )}
                      </div>

                      {/* Ward */}
                      <div className="relative space-y-1.5" ref={wardDropdownRef}>
                        <label className="text-sm font-semibold text-foreground tracking-tighter">
                          Phường/Xã
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={wardSearch || formData.ward}
                            disabled={!selectedProvinceCode}
                            onChange={(e) => {
                              setWardSearch(e.target.value);
                              setWardOpen(true);
                              setFormData((prev) => ({ ...prev, ward: "" }));
                            }}
                            onFocus={() => {
                              setWardOpen(true);
                              setWardSearch("");
                            }}
                            placeholder="Chọn phường/xã"
                            readOnly={!!formData.ward && !wardOpen}
                            className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 pr-8 tracking-tighter focus-visible:ring-0 focus-visible:border-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <CaretDown
                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform pointer-events-none ${wardOpen ? "rotate-180" : ""}`}
                          />
                        </div>
                        {wardOpen && (
                          <div
                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto"
                            style={{ maxHeight: "220px" }}
                          >
                            {wards
                              .filter((w) =>
                                w.name
                                  .toLowerCase()
                                  .includes((wardSearch || "").toLowerCase()),
                              )
                              .map((w) => (
                                <button
                                  key={w.code}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      ward: w.name,
                                    }));
                                    setWardOpen(false);
                                    setWardSearch("");
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm tracking-tighter hover:bg-muted/50 transition-colors ${formData.ward === w.name
                                    ? "bg-primary/5 text-primary font-bold"
                                    : ""
                                    }`}
                                >
                                  {w.name}
                                </button>
                              ))}
                            {wards.filter((w) =>
                              w.name
                                .toLowerCase()
                                .includes((wardSearch || "").toLowerCase()),
                            ).length === 0 && (
                                <p className="text-sm text-muted-foreground px-4 py-3 text-center tracking-tighter">
                                  Không tìm thấy
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Avatar */}
                <div className="shrink-0 space-y-2 w-full max-w-36 sm:max-w-48">
                  <label className="text-sm font-semibold text-foreground tracking-tighter">
                    Ảnh đại diện
                  </label>
                  <div className="flex flex-col gap-3">
                    {/* Preview Block 3:4 */}
                    <div className="w-full aspect-3/4 border border-border/60 bg-muted overflow-hidden flex items-center justify-center relative group">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center flex flex-col items-center">
                          <ImageIcon
                            className="w-8 h-8 text-muted-foreground/30 mb-2"
                            weight="duotone"
                          />
                          <span className="text-sm text-muted-foreground/60 font-medium tracking-tighter">
                            Trống
                          </span>
                        </div>
                      )}

                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white text-black text-sm font-semibold tracking-tighter hover:bg-white/90 transition-colors inline-flex items-center gap-1.5"
                        >
                          <UploadSimple className="w-3.5 h-3.5" /> Thêm ảnh
                        </button>
                        {avatarFile && (
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="px-3 py-1.5 bg-red-500 text-white text-sm font-semibold tracking-tighter hover:bg-red-600 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Trash className="w-3.5 h-3.5" /> Xóa ảnh
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed tracking-tighter w-full">
                      Khuyên dùng ảnh chân dung tỷ lệ 3:4. Hỗ trợ định dạng JPG,
                      JPEG, PNG.
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* THÔNG TIN TÀI KHOẢN */}
            <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
              <p className="text-sm font-semibold text-primary mb-1 tracking-tighter">
                Mục II
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tighter">
                Tài khoản & Phân quyền
              </h2>
              <p className="text-base text-muted-foreground mt-1 leading-relaxed tracking-tighter">
                Tài khoản đăng nhập và cấp quyền hạn sử dụng trong hệ thống.
              </p>
            </div>

            <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground tracking-tighter">
                    Tên đăng nhập {" "}
                    <span className="text-primary">*</span>
                  </label>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="nguyenvana123"
                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 tracking-tighter focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground tracking-tighter">
                    Mật khẩu <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 tracking-tighter focus-visible:ring-0 focus-visible:border-foreground pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
                    >
                      {showPassword ? (
                        <EyeSlash className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground tracking-tighter">
                    Vai trò (Role) <span className="text-primary">*</span>
                  </label>
                  <Select
                    value={formData.roleId}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus:ring-0 focus:border-foreground text-sm font-medium tracking-tighter">
                      <SelectValue placeholder="Chọn vai trò..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="rounded-none border border-border/60 shadow-lg">
                      <SelectItem
                        value="1"
                        className="cursor-pointer font-medium text-sm tracking-tighter focus:bg-black/5 focus:text-foreground"
                      >
                        Quản trị viên (Admin)
                      </SelectItem>
                      <SelectItem
                        value="2"
                        className="cursor-pointer font-medium text-sm tracking-tighter focus:bg-black/5 focus:text-foreground"
                      >
                        Điều phối viên (Coordinator)
                      </SelectItem>
                      <SelectItem
                        value="3"
                        className="cursor-pointer font-medium text-sm tracking-tighter focus:bg-black/5 focus:text-foreground"
                      >
                        Cứu hộ viên (Rescuer)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
