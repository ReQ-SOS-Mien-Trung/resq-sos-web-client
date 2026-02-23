"use client";

import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeSlash, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useLogin,
  useGoogleLogin as useGoogleLoginApi,
} from "@/services/auth/hooks";
import { useGoogleLogin as useGoogleOAuth } from "@react-oauth/google";
import { useAuthStore } from "@/stores/auth.store";
import { getDashboardPathByRole } from "@/lib/roles";

const SignIn = () => {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (accessToken && user?.roleId) {
      const dashboardPath = getDashboardPathByRole(user.roleId);
      if (dashboardPath) {
        router.replace(dashboardPath);
      }
    }
  }, [accessToken, user, router]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Login hook with error callbacks
  const { mutate: login, isPending: isLoading } = useLogin({
    onError: () => {
      setErrors({ general: "Tên đăng nhập hoặc mật khẩu không đúng" });
    },
    onUnauthorizedRole: () => {
      setErrors({
        general: "Tài khoản của bạn không có quyền truy cập hệ thống này",
      });
    },
  });

  // Google login hook with error callbacks
  const { mutate: googleLoginApi, isPending: isGoogleLoading } =
    useGoogleLoginApi({
      onError: () => {
        setErrors({ general: "Đăng nhập với Google thất bại" });
      },
      onUnauthorizedRole: () => {
        setErrors({
          general: "Tài khoản của bạn không có quyền truy cập hệ thống này",
        });
      },
    });

  // Google OAuth handler
  const handleGoogleLogin = useGoogleOAuth({
    onSuccess: (tokenResponse) => {
      googleLoginApi({ idToken: tokenResponse.access_token });
    },
    onError: (error) => {
      setErrors({ general: "Đăng nhập với Google thất bại" });
      console.error("Google OAuth error:", error);
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = "Tên đăng nhập là bắt buộc";
    } else if (formData.username.length < 3) {
      newErrors.username = "Tên đăng nhập phải có ít nhất 3 ký tự";
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

    // Just call login - hooks handle success/error internally
    login(formData);
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
        {/* General Error */}
        {errors.general && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive">
            <p className="text-sm text-destructive font-sans">
              {errors.general}
            </p>
          </div>
        )}

        {/* Username Input */}
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium text-foreground font-sans"
          >
            Tên đăng nhập
          </label>
          <Input
            id="username"
            type="text"
            placeholder="Nhập tên đăng nhập"
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            leftIcon={<User size={16} />}
            variant={errors.username ? "error" : "default"}
            className={cn("h-11", errors.username && "border-destructive")}
          />
          {errors.username && (
            <p className="text-sm text-destructive font-sans animate-in fade-in-0 slide-in-from-top-1 duration-200">
              {errors.username}
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
          onClick={() => handleGoogleLogin()}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              Đang xử lý...
            </span>
          ) : (
            <>
              <Image
                src="/icons/google.svg"
                alt="Google"
                width={20}
                height={20}
              />
              Đăng nhập với Google
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default SignIn;
