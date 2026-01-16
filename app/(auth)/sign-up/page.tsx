"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SignUp = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Họ tên là bắt buộc";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Họ tên phải có ít nhất 2 ký tự";
    }

    if (!formData.email) {
      newErrors.email = "Email là bắt buộc";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // TODO: Replace with actual API call
    console.log("Sign up:", formData);

    setIsLoading(false);
    router.push("/dashboard");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold font-sans">Tạo tài khoản mới</h1>
        <p className="text-base text-muted-foreground font-sans">
          Điền thông tin để bắt đầu sử dụng hệ thống
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground font-sans"
              >
                Họ và tên
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                variant={errors.name ? "error" : "default"}
                className={cn(
                  "h-11",
                  errors.name && "border-destructive"
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground font-sans"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                variant={errors.email ? "error" : "default"}
                className={cn(
                  "h-11",
                  errors.email && "border-destructive"
                )}
              />
              {errors.email && (
                <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground font-sans"
              >
                Mật khẩu
              </label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                variant={errors.password ? "error" : "default"}
                className={cn(
                  "h-11",
                  errors.password && "border-destructive"
                )}
              />
              {errors.password && (
                <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground font-sans"
              >
                Xác nhận mật khẩu
              </label>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                variant={errors.confirmPassword ? "error" : "default"}
                className={cn(
                  "h-11",
                  errors.confirmPassword && "border-destructive"
                )}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold font-sans transition-all hover:scale-[1.02] active:scale-[0.98] mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Đang tạo tài khoản...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Đăng ký
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-sans">
              Đã có tài khoản?{" "}
              <Link
                href="/sign-in"
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
    </div>
  );
};

export default SignUp;
