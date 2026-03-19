"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Lock,
  Eye,
  EyeSlash,
  ArrowRight,
  EnvelopeSimple,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
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
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";

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
  const [usernameTouched, setUsernameTouched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // GSAP animation on authMethod change
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

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

  // Handle username blur for touched state
  const handleUsernameBlur = () => {
    setUsernameTouched(true);
    if (formData.username && formData.username.length < 3) {
      setErrors((prev) => ({
        ...prev,
        username: "Tên đăng nhập phải có ít nhất 3 ký tự",
      }));
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-6">
      <div ref={formRef}>
        {/* Header */}
        <div className="space-y-2 mb-8">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FF5722]">
            Chào mừng trở lại
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-[1.1]">
            ĐĂNG NHẬP
            <br />
            <span className="text-black/30">RESQ SOS</span>
          </h1>
          <p className="text-sm sm:text-base text-black/60">
            Đăng nhập vào tài khoản của bạn để tiếp tục
          </p>
        </div>

        {/* General Error */}
        <AnimatePresence mode="wait">
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="p-3 rounded-lg bg-red-50 border-2 border-red-200 mb-6"
            >
              <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                <X className="w-4 h-4" weight="bold" />
                {errors.general}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black/60 mb-2">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                onBlur={handleUsernameBlur}
                placeholder="Nhập tên đăng nhập"
                required
                className={cn(
                  "w-full pl-12 pr-12 py-4 border-2 focus:border-black outline-none text-sm transition-all rounded-lg",
                  errors.username && usernameTouched
                    ? "border-red-500 focus:border-red-500"
                    : formData.username && !errors.username && usernameTouched
                      ? "border-green-500"
                      : "border-black/20",
                )}
              />
              <AnimatePresence>
                {formData.username && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      handleChange("username", "");
                      setUsernameTouched(false);
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-black/5 rounded-full p-1 transition-colors group"
                  >
                    <X
                      className="w-4 h-4 text-black/40 group-hover:text-red-500 transition-colors"
                      weight="bold"
                    />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              {errors.username && usernameTouched && (
                <motion.p
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-sm text-red-500 flex items-center gap-1 mt-2"
                >
                  <X className="w-4 h-4" /> {errors.username}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-black/60">
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#FF5722] hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-12 py-4 border-2 border-black/20 focus:border-black outline-none text-sm transition-colors rounded-lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
              >
                {showPassword ? (
                  <EyeSlash className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-sm text-red-500 flex items-center gap-1 mt-2"
                >
                  <X className="w-4 h-4" /> {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formData.username || !formData.password}
            className="w-full px-6 py-4 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                Đăng nhập
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-xs text-black/40 uppercase tracking-wider">
            Hoặc tiếp tục với
          </span>
          <div className="flex-1 h-px bg-black/10" />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          className="w-full px-6 py-4 bg-white border-2 border-black/20 text-sm font-bold uppercase tracking-wider hover:border-black transition-all flex items-center justify-center gap-3 group rounded-lg"
          onClick={() => handleGoogleLogin()}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
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
        </button>
      </div>
    </div>
  );
};

export default SignIn;
