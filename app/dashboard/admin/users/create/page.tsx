"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, CheckCircle, CaretDown, MapPin, X, Image as ImageIcon, UploadSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAdminCreateUser } from "@/services/user/hooks";

export default function CreateUserPage() {
    const router = useRouter();
    const createUserMutation = useAdminCreateUser();

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

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
    const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
    const [cityOpen, setCityOpen] = useState(false);
    const [wardOpen, setWardOpen] = useState(false);
    const [citySearch, setCitySearch] = useState("");
    const [wardSearch, setWardSearch] = useState("");

    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const wardDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch provinces on mount
    useEffect(() => {
        fetch("https://provinces.open-api.vn/api/v2/")
            .then(r => r.json())
            .then(data => setProvinces(data))
            .catch(() => { });
    }, []);

    // Fetch wards when province changes
    useEffect(() => {
        if (!selectedProvinceCode) { setWards([]); return; }
        fetch(`https://provinces.open-api.vn/api/v2/p/${selectedProvinceCode}?depth=2`)
            .then(r => r.json())
            .then(data => setWards(data.wards || []))
            .catch(() => { });
    }, [selectedProvinceCode]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) setCityOpen(false);
            if (wardDropdownRef.current && !wardDropdownRef.current.contains(e.target as Node)) setWardOpen(false);
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
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
        if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.phone || !formData.password) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        const proceedWithCreation = (uploadedUrl?: string) => {
            toast.loading("Đang tạo tài khoản...");
            createUserMutation.mutate(
                {
                    ...formData,
                    roleId: parseInt(formData.roleId, 10),
                    province: formData.city,
                    avatarUrl: uploadedUrl || undefined,
                },
                {
                    onSuccess: () => {
                        toast.dismiss();
                        toast.success("Tạo tài khoản thành công!");
                        router.push("/dashboard/admin/users");
                    },
                    onError: (err: any) => {
                        toast.dismiss();
                        const msg = err?.response?.data?.message || err.message || "Đã xảy ra lỗi!";
                        toast.error("Không thể tạo tài khoản: " + msg);
                    },
                }
            );
        };

        if (avatarFile) {
            setIsUploading(true);
            toast.loading("Đang tải ảnh lên hệ thống...");
            const uploadData = new FormData();
            uploadData.append("file", avatarFile);
            uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ResQ_SOS");

            fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dezgwdrfs"}/image/upload`, {
                method: "POST",
                body: uploadData,
            })
                .then(res => res.json())
                .then(data => {
                    if (data.secure_url) {
                        toast.dismiss();
                        setIsUploading(false);
                        proceedWithCreation(data.secure_url);
                    } else {
                        throw new Error("Lỗi tải ảnh");
                    }
                })
                .catch(err => {
                    toast.dismiss();
                    setIsUploading(false);
                    toast.error("Tải ảnh thất bại, vui lòng kiểm tra lại ảnh hoặc kết nối mạng!");
                });
        } else {
            proceedWithCreation();
        }
    };

    return (
        <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                {/* Header & Back Action */}
                <div>
                    <button
                        onClick={() => router.push("/dashboard/admin/users")}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách
                    </button>
                    <div className="pb-1 mb-2">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight flex items-center gap-3">
                            <UserPlus size={32} weight="bold" />
                            Tạo người dùng mới
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">
                            Điền thông tin bên dưới để cấp phát tài khoản truy cập hệ thống quản trị ResQ.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
                        {/* THÔNG TIN CÁ NHÂN */}
                        <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
                            <p className="text-xs font-semibold text-[#FF5722] mb-1">Mục 01</p>
                            <h2 className="text-lg font-bold text-foreground">Thông tin cá nhân</h2>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Họ tên và thông tin cơ bản liên lạc của người dùng mới.
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">Họ <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Nguyễn Văn"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">Tên <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="A"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Ảnh đại diện (Avatar)</label>
                                <div className="flex items-center gap-4">
                                    {/* Preview Block */}
                                    <div className="flex-shrink-0 h-16 w-16 border-2 border-border/60 bg-muted overflow-hidden flex items-center justify-center">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-9 px-4 rounded-none border-border/60 text-sm font-medium bg-transparent hover:bg-muted"
                                            >
                                                <UploadSimple className="w-4 h-4 mr-2" />
                                                Chọn ảnh
                                            </Button>
                                            {avatarFile && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveFile}
                                                    className="h-9 px-3 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Hỗ trợ định dạng: JPG, PNG. Khuyên dùng thiết kế vuông 1:1.
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">Email <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="example@resq.com"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">Số điện thoại <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="0912345678"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* HO KHẨU & ĐỊA CHỈ */}
                        <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
                            <p className="text-xs font-semibold text-[#FF5722] mb-1">Mục 02</p>
                            <h2 className="text-lg font-bold text-foreground">Vị trí & Địa chỉ</h2>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Thông tin nơi cư trú và địa chỉ liên lạc của người dùng.
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4 space-y-5">
                            {/* Address Layout */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-foreground">
                                        Địa chỉ
                                    </label>
                                    {(formData.address || formData.city) && (
                                        <button
                                            type="button"
                                            onClick={handleClearLocation}
                                            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                                        className="h-11 pl-8 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* City/Province */}
                                    <div className="relative space-y-1.5" ref={cityDropdownRef}>
                                        <label className="text-sm font-semibold text-foreground">Tỉnh/Thành phố</label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                value={citySearch || formData.city}
                                                onChange={e => { setCitySearch(e.target.value); setCityOpen(true); setFormData(prev => ({ ...prev, city: "", ward: "" })); setSelectedProvinceCode(null); setWards([]); }}
                                                onFocus={() => { setCityOpen(true); setCitySearch(""); }}
                                                placeholder="Chọn tỉnh/thành phố"
                                                readOnly={!!formData.city && !cityOpen}
                                                className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 pr-8 focus-visible:ring-0 focus-visible:border-foreground cursor-pointer"
                                            />
                                            <CaretDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform pointer-events-none ${cityOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {cityOpen && (
                                            <div className="absolute z-50 top-[100%] left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto" style={{ maxHeight: '220px' }}>
                                                {provinces.length === 0 && (
                                                    <p className="text-xs text-muted-foreground px-4 py-3 text-center">Đang tải...</p>
                                                )}
                                                {provinces
                                                    .filter(p => p.name.toLowerCase().includes((citySearch || "").toLowerCase()))
                                                    .map(p => (
                                                        <button
                                                            key={p.code}
                                                            type="button"
                                                            onMouseDown={e => e.preventDefault()}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, city: p.name, ward: "" }));
                                                                setSelectedProvinceCode(p.code);
                                                                setWards([]);
                                                                setCityOpen(false);
                                                                setCitySearch("");
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-muted/50 transition-colors ${formData.city === p.name ? 'bg-primary/5 text-primary font-bold' : ''
                                                                }`}
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))
                                                }
                                                {provinces.length > 0 && provinces.filter(p => p.name.toLowerCase().includes((citySearch || "").toLowerCase())).length === 0 && (
                                                    <p className="text-xs text-muted-foreground px-4 py-3 text-center">Không tìm thấy</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ward */}
                                    <div className="relative space-y-1.5" ref={wardDropdownRef}>
                                        <label className="text-sm font-semibold text-foreground">Phường/Xã</label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                value={wardSearch || formData.ward}
                                                disabled={!selectedProvinceCode}
                                                onChange={e => { setWardSearch(e.target.value); setWardOpen(true); setFormData(prev => ({ ...prev, ward: "" })); }}
                                                onFocus={() => { setWardOpen(true); setWardSearch(""); }}
                                                placeholder="Chọn phường/xã"
                                                readOnly={!!formData.ward && !wardOpen}
                                                className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 pr-8 focus-visible:ring-0 focus-visible:border-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <CaretDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform pointer-events-none ${wardOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {wardOpen && (
                                            <div className="absolute z-50 top-[100%] left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto" style={{ maxHeight: '220px' }}>
                                                {wards
                                                    .filter(w => w.name.toLowerCase().includes((wardSearch || "").toLowerCase()))
                                                    .map(w => (
                                                        <button
                                                            key={w.code}
                                                            type="button"
                                                            onMouseDown={e => e.preventDefault()}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, ward: w.name }));
                                                                setWardOpen(false);
                                                                setWardSearch("");
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-muted/50 transition-colors ${formData.ward === w.name ? 'bg-primary/5 text-primary font-bold' : ''
                                                                }`}
                                                        >
                                                            {w.name}
                                                        </button>
                                                    ))
                                                }
                                                {wards.filter(w => w.name.toLowerCase().includes((wardSearch || "").toLowerCase())).length === 0 && (
                                                    <p className="text-xs text-muted-foreground px-4 py-3 text-center">Không tìm thấy</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* THÔNG TIN TÀI KHOẢN */}
                        <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
                            <p className="text-xs font-semibold text-[#FF5722] mb-1">Mục 03</p>
                            <h2 className="text-lg font-bold text-foreground">Tài khoản & Phân quyền</h2>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Tài khoản đăng nhập và cấp quyền hạn sử dụng trong hệ thống ResQ.
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Tên đăng nhập (Username) <span className="text-[#FF5722]">*</span></label>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="nguyenvana123"
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Mật khẩu <span className="text-[#FF5722]">*</span></label>
                                <Input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                />
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-sm font-semibold text-foreground">Vai trò (Role) <span className="text-[#FF5722]">*</span></label>
                                <Select value={formData.roleId} onValueChange={handleRoleChange}>
                                    <SelectTrigger className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus:ring-0 focus:border-foreground text-sm font-medium">
                                        <SelectValue placeholder="Chọn vai trò..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border border-border/60">
                                        <SelectItem value="1" className="cursor-pointer font-medium text-sm focus:bg-black/5 focus:text-foreground">Quản trị viên (Admin)</SelectItem>
                                        <SelectItem value="2" className="cursor-pointer font-medium text-sm focus:bg-black/5 focus:text-foreground">Điều phối viên (Coordinator)</SelectItem>
                                        <SelectItem value="3" className="cursor-pointer font-medium text-sm focus:bg-black/5 focus:text-foreground">Cứu hộ viên (Rescuer)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-border/60 flex justify-end">
                        <Button
                            type="submit"
                            disabled={createUserMutation.isPending || isUploading}
                            className="bg-black hover:bg-black/80 dark:bg-white dark:hover:bg-white/80 dark:text-black text-white h-12 px-8 rounded-none border-b-4 border-[#FF5722] hover:translate-y-px transition-all font-bold text-sm"
                        >
                            {createUserMutation.isPending || isUploading ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle size={16} weight="bold" />
                                    Xác nhận khởi tạo
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
