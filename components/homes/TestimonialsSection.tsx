"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { ArrowRight } from "lucide-react";
import { testimonials } from "@/lib/constants";
import gsap from "gsap";

const TestimonialsSection = () => {
  const middleIndex = Math.floor(testimonials.length / 2);
  const [activeId, setActiveId] = useState<string>(
    testimonials[middleIndex]?.id || testimonials[0]?.id,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const orgNameRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const iconRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      testimonials.forEach((testimonial) => {
        const card = cardRefs.current.get(testimonial.id);
        const content = contentRefs.current.get(testimonial.id);
        const orgName = orgNameRefs.current.get(testimonial.id);
        const icon = iconRefs.current.get(testimonial.id);
        const isActive = testimonial.id === activeId;

        if (card) {
          gsap.to(card, {
            flex: isActive ? 2.5 : 0,
            minWidth: isActive ? 0 : 80,
            backgroundColor: isActive ? "#18181b" : "#141417",
            borderColor: isActive
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.1)",
            duration: 0.35,
            ease: "power2.inOut",
          });
        }

        if (content) {
          gsap.to(content, {
            opacity: isActive ? 1 : 0,
            y: isActive ? 0 : 8,
            duration: 0.25,
            delay: isActive ? 0.15 : 0,
            ease: "power2.out",
            pointerEvents: isActive ? "auto" : "none",
          });
        }

        if (orgName) {
          gsap.to(orgName, {
            opacity: isActive ? 1 : 0,
            maxWidth: isActive ? 200 : 0,
            marginLeft: isActive ? 8 : 0,
            duration: 0.25,
            ease: "power2.out",
          });
        }

        if (icon) {
          gsap.to(icon, {
            color: isActive ? "var(--color-primary)" : "#4b5563",
            scale: 1,
            duration: 0.2,
            ease: "power2.out",
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [activeId]);

  const handleHover = (id: string, isEntering: boolean) => {
    if (id === activeId) return;

    const card = cardRefs.current.get(id);
    const icon = iconRefs.current.get(id);

    if (card) {
      gsap.to(card, {
        backgroundColor: isEntering ? "#1a1a1f" : "#141417",
        borderColor: isEntering
          ? "rgba(255,255,255,0.2)"
          : "rgba(255,255,255,0.1)",
        duration: 0.2,
        ease: "power2.out",
      });
    }

    if (icon) {
      gsap.to(icon, {
        color: isEntering ? "var(--color-primary)" : "#4b5563",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  return (
    <section className="py-20 lg:py-32 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={containerRef} className="flex flex-row gap-4 items-stretch">
          {testimonials.map((testimonial) => {
            const isActive = testimonial.id === activeId;

            return (
              <button
                key={testimonial.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(testimonial.id, el);
                }}
                onClick={() => setActiveId(testimonial.id)}
                onMouseEnter={() => handleHover(testimonial.id, true)}
                onMouseLeave={() => handleHover(testimonial.id, false)}
                className={`
                  relative rounded-2xl border overflow-hidden cursor-pointer min-h-96
                  ${isActive ? "flex-[2.5] border-white/20 bg-[#18181b]" : "flex w-20 min-w-20 border-white/10 bg-[#141417]"}
                `}
                style={{
                  willChange: "flex, min-width, background-color, border-color",
                }}
              >
                <div
                  className={`h-full flex ${isActive ? "flex-col p-6 lg:p-10" : "flex-col items-center justify-center"}`}
                >
                  {/* Logo/Icon - Always visible */}
                  <div
                    className={`flex ${isActive ? "items-center mb-8 text-gray-400" : "flex-col items-center justify-center"}`}
                  >
                    <span
                      ref={(el) => {
                        if (el) iconRefs.current.set(testimonial.id, el);
                      }}
                      className={isActive ? "text-primary" : "text-gray-600"}
                      style={{ willChange: "color, transform" }}
                    >
                      {testimonial.orgIcon}
                    </span>
                    <span
                      ref={(el) => {
                        if (el) orgNameRefs.current.set(testimonial.id, el);
                      }}
                      className="text-sm font-semibold tracking-wide uppercase overflow-hidden whitespace-nowrap"
                      style={{
                        opacity: isActive ? 1 : 0,
                        maxWidth: isActive ? 200 : 0,
                        willChange: "opacity, max-width",
                      }}
                    >
                      {testimonial.orgName}
                    </span>
                  </div>

                  {/* Expanded Content - Only when active */}
                  <div
                    ref={(el) => {
                      if (el) contentRefs.current.set(testimonial.id, el);
                    }}
                    className="flex flex-col flex-1"
                    style={{
                      opacity: isActive ? 1 : 0,
                      pointerEvents: isActive ? "auto" : "none",
                      position: isActive ? "relative" : "absolute",
                      willChange: "opacity, transform",
                    }}
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
