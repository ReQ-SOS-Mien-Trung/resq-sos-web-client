import { partners } from "@/lib/constants";

const PartnersSection = () => {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500 mb-12">
          Được tin tưởng bởi các
          <br />
          <span className="text-white font-medium">
            tổ chức hàng đầu Việt Nam
          </span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer group"
            >
              <span className="opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all">
                {partner.icon}
              </span>
              <span className="text-sm font-medium">{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;

