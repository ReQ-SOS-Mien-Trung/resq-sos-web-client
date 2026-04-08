"use client";

import { useRef } from "react";

// Type declarations are in types/lord-icon.d.ts

interface LordIconProps {
  src: string;
  trigger?:
    | "loop"
    | "hover"
    | "click"
    | "morph"
    | "boomerang"
    | "loop-on-hover";
  delay?: number;
  size?: number;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  className?: string;
}

/**
 * LordIcon Component
 * A wrapper for Lordicon animated icons
 *
 * @example
 * <LordIcon
 *   src="https://cdn.lordicon.com/mhwzfwxu.json"
 *   trigger="loop"
 *   delay={2000}
 *   size={100}
 *   colors={{ primary: "#e83a30", secondary: "#f28621" }}
 * />
 */
const LordIcon = ({
  src,
  trigger = "loop",
  delay = 0,
  size = 100,
  colors,
  className,
}: LordIconProps) => {
  const iconRef = useRef<HTMLElement>(null);

  // Build colors string for lord-icon
  const colorsString = colors
    ? `primary:${colors.primary || "#e83a30"},secondary:${colors.secondary || "#f28621"}`
    : undefined;

  return (
    <lord-icon
      ref={iconRef}
      src={src}
      trigger={trigger}
      delay={delay.toString()}
      colors={colorsString}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
};

export default LordIcon;
