"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { testimonials } from "@/lib/constants";

const TestimonialsSection = () => {
  // Set middle card as default active
  const middleIndex = Math.floor(testimonials.length / 2);
  const [activeId, setActiveId] = useState<string>(
    testimonials[middleIndex]?.id || testimonials[0]?.id,
  );

  return (
    <section className="py-20 lg:py-32 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row gap-4 items-stretch">
          {testimonials.map((testimonial) => {
            const isActive = testimonial.id === activeId;

            return (
              <button
                key={testimonial.id}
                onClick={() => setActiveId(testimonial.id)}
                className={`
                  relative rounded-2xl border overflow-hidden cursor-pointer
                  transition-all duration-700 ease-out
                  ${
                    isActive
                      ? "flex-[2.5] border-white/20 bg-[#18181b] min-h-[380px]"
                      : "flex-[0] w-[80px] min-w-[80px] border-white/10 bg-[#141417] hover:bg-[#1a1a1f] hover:border-white/20 min-h-[380px] hover:scale-[1.02] active:scale-[0.98]"
                  }
                `}
              >
                <div
                  className={`h-full flex transition-all duration-500 ${isActive ? "flex-col p-6 lg:p-10" : "flex-col items-center justify-center"}`}
                >
                  {/* Logo/Icon - Always visible */}
                  <div
                    className={`flex transition-all duration-500 ${isActive ? "items-center gap-2 mb-8 text-gray-400" : "flex-col items-center justify-center gap-0 hover:text-primary"}`}
                  >
                    <span
                      className={`transition-colors duration-500 ${isActive ? "text-primary" : "text-gray-600"}`}
                    >
                      {testimonial.orgIcon}
                    </span>
                    <span
                      className={`text-sm font-semibold tracking-wide uppercase transition-all duration-500 overflow-hidden whitespace-nowrap ${
                        isActive
                          ? "opacity-100 max-w-[200px]"
                          : "opacity-0 max-w-0"
                      }`}
                    >
                      {testimonial.orgName}
                    </span>
                  </div>

                  {/* Expanded Content - Only when active */}
                  <div
                    className={`flex flex-col flex-1 transition-opacity duration-500 ${
                      isActive
                        ? "opacity-100 delay-300"
                        : "opacity-0 pointer-events-none absolute"
                    }`}
                  >
                    {/* Headline */}
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-[1.2] mb-1 text-left">
                      {testimonial.headline}
                    </h3>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-600 leading-[1.2] mb-10 text-left">
                      {testimonial.highlightText}
                    </p>

                    {/* Quote */}
                    <blockquote className="text-gray-400 text-sm lg:text-base mb-8 leading-relaxed max-w-xl text-left">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>

                    {/* Author & CTA */}
                    <div className="mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium text-xs">
                          {testimonial.author.avatar}
                        </div>
                        <div className="text-sm text-left">
                          <span className="text-white font-medium">
                            {testimonial.author.name}
                          </span>
                          <span className="text-gray-500">
                            , {testimonial.author.role}
                          </span>
                        </div>
                      </div>

                      <a
                        href="#"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                      >
                        <span className="text-sm">Đọc câu chuyện</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </a>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
