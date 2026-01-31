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
