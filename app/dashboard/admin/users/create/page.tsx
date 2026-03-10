"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, CheckCircle } from "@phosphor-icons/react";
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
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRoleChange = (value: string) => {
        setFormData((prev) => ({ ...prev, roleId: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.phone || !formData.password) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        toast.loading("Đang tạo tài khoản...");

        createUserMutation.mutate(
            {
                ...formData,
                roleId: parseInt(formData.roleId, 10),
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

    return (
        <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                {/* Header & Back Action */}
                <div>
                    <button
                        onClick={() => router.push("/dashboard/admin/users")}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group mb-6"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách
                    </button>
                    <div className="border-b border-border/60 pb-6 mb-8">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight flex items-center gap-3">
                            <UserPlus size={32} weight="bold" />
                            Tạo người dùng mới
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">
                            Điền thông tin bên dưới để cấp phát tài khoản truy cập hệ thống quản trị ResQ.
                        </p>
                    </div>
                </div>

                {/* Form - Editorial Minimalist Style */}
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
                        {/* THÔNG TIN CÁ NHÂN */}
                        <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF5722] mb-1">Mục 01</p>
                            <h2 className="text-lg font-bold text-foreground">Thông tin cá nhân</h2>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Họ tên và thông tin cơ bản liên lạc của người dùng mới.
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Họ <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Nguyễn Văn"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Tên <span className="text-[#FF5722]">*</span></label>
                                    <Input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="A"
                                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Email <span className="text-[#FF5722]">*</span></label>
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
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Số điện thoại <span className="text-[#FF5722]">*</span></label>
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

                        {/* THÔNG TIN TÀI KHOẢN */}
                        <div className="col-span-1 md:col-span-4 border-t border-black/10 dark:border-white/10 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF5722] mb-1">Mục 02</p>
                            <h2 className="text-lg font-bold text-foreground">Tài khoản & Phân quyền</h2>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Tài khoản đăng nhập và cấp quyền hạn sử dụng trong hệ thống ResQ.
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-8 border-t border-black/10 dark:border-white/10 pt-4 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Tên đăng nhập (Username) <span className="text-[#FF5722]">*</span></label>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="nguyenvana123"
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Mật khẩu <span className="text-[#FF5722]">*</span></label>
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
                                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Vai trò (Role) <span className="text-[#FF5722]">*</span></label>
                                <Select value={formData.roleId} onValueChange={handleRoleChange}>
                                    <SelectTrigger className="h-11 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-transparent px-0 focus:ring-0 focus:border-foreground uppercase text-sm font-semibold tracking-wide">
                                        <SelectValue placeholder="Chọn vai trò..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border border-border/60">
                                        <SelectItem value="1" className="cursor-pointer font-medium uppercase tracking-wider text-xs focus:bg-black/5 focus:text-foreground">Quản trị viên (Admin)</SelectItem>
                                        <SelectItem value="2" className="cursor-pointer font-medium uppercase tracking-wider text-xs focus:bg-black/5 focus:text-foreground">Điều phối viên (Coordinator)</SelectItem>
                                        <SelectItem value="3" className="cursor-pointer font-medium uppercase tracking-wider text-xs focus:bg-black/5 focus:text-foreground">Cứu hộ viên (Rescuer)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-border/60 flex justify-end">
                        <Button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="bg-black hover:bg-black/80 dark:bg-white dark:hover:bg-white/80 dark:text-black text-white h-12 px-8 rounded-none border-b-4 border-[#FF5722] hover:translate-y-px transition-all uppercase font-black tracking-widest text-xs"
                        >
                            {createUserMutation.isPending ? (
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
