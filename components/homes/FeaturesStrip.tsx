import { features } from "@/lib/constants";

const FeaturesStrip = () => {
  return (
    <section className="py-8 border-y border-white/5 bg-[#0a0a0c]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="text-sm text-gray-500 whitespace-nowrap">
            <span className="text-primary font-medium">Tính năng</span> nổi bật
            <br className="hidden md:block" />
            của hệ thống
          </div>
          <div className="flex-1 flex flex-wrap items-center justify-center md:justify-start gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group cursor-pointer"
              >
                <span className="text-gray-600 group-hover:text-primary transition-colors">
                  {feature.icon}
                </span>
                <span className="text-sm">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;

