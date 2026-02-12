"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { useAuthStore } from "@/stores/auth.store";
import { getDashboardPathByRole } from "@/lib/roles";
import {
  HeaderHome,
  NetworkMapSection,
  TestimonialsSection,
  HeroSection,
  FeaturesStrip,
  PartnersSection,
  ProductsSection,
  SecuritySection,
  FooterHome,
} from "@/components/homes";

const Home = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
    })),
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect to dashboard if authenticated and has a role-specific dashboard
  useEffect(() => {
    if (hasHydrated && isAuthenticated && user) {
      const dashboardPath = getDashboardPathByRole(user.roleId);
      if (dashboardPath) {
        router.push(dashboardPath);
      }
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Show nothing while hydrating or if redirecting
  const shouldRedirect =
    hasHydrated &&
    isAuthenticated &&
    user &&
    getDashboardPathByRole(user.roleId);

  if (!hasHydrated || shouldRedirect) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <HeaderHome />
      <HeroSection />
      <FeaturesStrip />
      <PartnersSection />
      <ProductsSection />
      <TestimonialsSection />
      <SecuritySection />
      <NetworkMapSection />
      <FooterHome />
    </div>
  );
};

export default Home;
