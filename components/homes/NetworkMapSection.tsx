"use client";

import { useState } from "react";
import Image from "next/image";
import { mapImages, tabDescriptions, tabs } from "@/lib/constants";

const NetworkMapSection = () => {
  const [activeTab, setActiveTab] = useState<"centers" | "depots" | "teams">(
    "centers",
  );


  return (
    <section className="py-20 lg:py-32 bg-[#ffffff]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Mạng lưới ResQ SOS<span className="text-primary">_</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
            Hệ thống phủ sóng toàn bộ 12 tỉnh thành Miền Trung, với các trung
            tâm điều phối, kho vật tư và đội cứu hộ sẵn sàng ứng cứu kịp thời.
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors"
          >
            Tìm hiểu về mạng lưới
          </a>
        </div>

        {/* Map Container */}
        <div className="relative mt-12 mb-8">
          {/* Vietnam Map with Image - switches based on active tab */}
          <div className="relative w-full max-w-md mx-auto aspect-[9/16]">
            <Image
              key={activeTab}
              src={mapImages[activeTab]}
              alt="Bản đồ Việt Nam"
              fill
              className="object-contain transition-opacity duration-300"
              priority
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center p-1 rounded-full bg-white border border-gray-200 shadow-sm mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                  ${activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <span
                  className={
                    activeTab === tab.id ? "text-white" : "text-primary"
                  }
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Description */}
          <p className="text-gray-500 text-sm text-center max-w-md">
            {tabDescriptions[activeTab]}
          </p>
        </div>
      </div>
    </section>
  );
};

export default NetworkMapSection;
