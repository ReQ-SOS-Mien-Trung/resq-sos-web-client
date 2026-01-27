"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { testimonials } from "@/lib/constants";



const TestimonialsSection = () => {
  const [activeId, setActiveId] = useState<string>("redcross");

  const activeTestimonial = testimonials.find((t) => t.id === activeId);
  const inactiveTestimonials = testimonials.filter((t) => t.id !== activeId);

  return (
    <section className="py-20 lg:py-32 bg-[#0a0a0c]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-5 items-stretch">
          {/* Main Active Card */}
          <div className="flex-1 lg:flex-[2.5] min-h-[380px] rounded-2xl border border-white/10 bg-[#18181b] p-8 lg:p-10 transition-all duration-700 ease-out">
            {activeTestimonial && (
              <div className="flex flex-col h-full animate-in fade-in duration-500">
                {/* Org Badge */}
                <div className="flex items-center gap-2 text-gray-400 mb-8">
                  <span className="text-primary">
                    {activeTestimonial.orgIcon}
                  </span>
                  <span className="text-sm font-semibold tracking-wide uppercase">
                    {activeTestimonial.orgName}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-[1.2] mb-1">
                  {activeTestimonial.headline}
                </h3>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-600 leading-[1.2] mb-10">
                  {activeTestimonial.highlightText}
                </p>

                {/* Quote */}
                <blockquote className="text-gray-400 text-sm lg:text-base mb-8 leading-relaxed max-w-xl">
                  &ldquo;{activeTestimonial.quote}&rdquo;
                </blockquote>

                {/* Author & CTA */}
                <div className="mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium text-xs">
                      {activeTestimonial.author.avatar}
                    </div>
                    <div className="text-sm">
                      <span className="text-white font-medium">
                        {activeTestimonial.author.name}
                      </span>
                      <span className="text-gray-500">
                        , {activeTestimonial.author.role}
                      </span>
                    </div>
                  </div>

                  <a
                    href="#"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                  >
                    <span className="text-sm">Đọc câu chuyện</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Side Cards */}
          <div className="flex flex-row lg:flex-col gap-4 lg:w-[280px]">
            {inactiveTestimonials.map((testimonial) => (
              <button
                key={testimonial.id}
                onClick={() => setActiveId(testimonial.id)}
                className="flex-1 lg:flex-1 group relative rounded-2xl border border-white/10 bg-[#141417] 
                           hover:bg-[#1a1a1f] hover:border-white/20 
                           transition-all duration-500 ease-out
                           min-h-[140px] lg:min-h-0"
              >
                {/* Content - centered */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <span className="text-gray-600 group-hover:text-primary transition-colors duration-300 mb-3">
                    {testimonial.orgIcon}
                  </span>
                  <span className="text-gray-500 group-hover:text-gray-300 text-sm font-medium transition-colors duration-300">
                    {testimonial.orgName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
