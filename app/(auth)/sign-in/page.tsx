"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  ArrowRight,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const SignIn = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

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
    console.log("Sign in:", formData);

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
        <h1 className="text-3xl font-bold font-sans">Chào mừng trở lại</h1>
        <p className="text-base text-muted-foreground font-sans">
          Đăng nhập vào tài khoản của bạn để tiếp tục
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            leftIcon={<Envelope size={16} />}
            variant={errors.email ? "error" : "default"}
            className={cn("h-11", errors.email && "border-destructive")}
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
            placeholder="Nhập mật khẩu của bạn"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            }
            variant={errors.password ? "error" : "default"}
            className={cn("h-11", errors.password && "border-destructive")}
          />
          {errors.password && (
            <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
              {errors.password}
            </p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline font-sans transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold font-sans transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Đang đăng nhập...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Đăng nhập
              <ArrowRight size={16} />
            </span>
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-sans">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        {/* Google Login Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium font-sans transition-all hover:scale-[1.02] active:scale-[0.98] gap-3"
          onClick={() => {
            // TODO: Implement Google OAuth
            console.log("Google login");
          }}
        >
          <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
          Đăng nhập với Google
        </Button>
      </form>
    </div>
  );
};

export default SignIn;
