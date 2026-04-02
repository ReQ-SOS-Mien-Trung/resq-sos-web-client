"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { useNotificationPushLifecycle } from "@/hooks/useNotificationPushLifecycle";
import { useThemeStore } from "@/stores/theme.store";

function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useTokenRefresh();
  return <>{children}</>;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const hasHydrated = useThemeStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [hasHydrated, isDarkMode]);

  return <>{children}</>;
}

function NotificationPushProvider({ children }: { children: React.ReactNode }) {
  useNotificationPushLifecycle();
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <NotificationPushProvider>
          <ThemeProvider>
            <TokenRefreshProvider>{children}</TokenRefreshProvider>
          </ThemeProvider>
        </NotificationPushProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
