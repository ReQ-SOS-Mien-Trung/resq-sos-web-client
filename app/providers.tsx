"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { useNotificationPushLifecycle } from "@/hooks/useNotificationPushLifecycle";
import { useBroadcastAlertListener } from "@/hooks/useBroadcastAlertListener";
import { useThemeStore } from "@/stores/theme.store";
import { isBackendConnectivityError } from "@/lib/backend-circuit";

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
  useBroadcastAlertListener();
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
            retry: (failureCount, error) => {
              if (isBackendConnectivityError(error)) return false;
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 8000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationPushProvider>
        <ThemeProvider>
          <TokenRefreshProvider>{children}</TokenRefreshProvider>
        </ThemeProvider>
      </NotificationPushProvider>
    </QueryClientProvider>
  );
}
