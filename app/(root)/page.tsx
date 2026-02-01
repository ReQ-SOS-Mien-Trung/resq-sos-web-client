"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect to sign-in if not authenticated (after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Show nothing while hydrating or redirecting
  if (!hasHydrated || !isAuthenticated) {
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
