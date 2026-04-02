"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const LOGO_PATH =
  "M393.724 123.906C387.609 118.729 381.307 114.266 374.849 110.474C361.443 122.542 348.406 136.203 351.083 152.953C353.547 165.896 355.135 176.682 355.203 189.938C348.396 198.24 343.953 183.12 342.328 175.01C335.828 144.573 305.917 188.214 300.177 197.672C297.083 202.771 289.828 197.911 293.099 192.328C297.297 184.859 307.089 175.786 306.604 167.771C302.589 165.099 284.318 179.302 278.078 182.802C272.438 186.422 267.714 179.016 273.177 175.521C306.672 154.005 307.563 151.786 270.016 161.672C265.818 162.932 263.62 156.526 268.083 155.203C288.646 148.203 319.984 139.125 276.13 139.786C269.339 140.188 269.688 134.01 273.995 133.708C284.094 133.292 290.443 133.224 303.01 129.854C320.823 124.266 334.307 112.396 344.214 97.9688C336.026 96 327.641 95 319.073 95C287.401 95 261.849 108.641 250.156 116.161C238.469 108.641 212.922 95 181.25 95C154.365 95 129.245 104.724 106.599 123.906C71.5729 153.563 58.599 193.375 70.0625 236.01C76.7396 260.839 94.0781 280.396 111.63 298.651C125.5 313.073 145.979 332.333 174.24 354.182C194.453 335.578 212.885 314.568 208.823 289.146C204.859 268.323 202.297 250.964 202.188 229.635C213.141 216.276 220.292 240.609 222.906 253.656C233.37 302.63 281.505 232.411 290.734 217.193C295.719 208.979 307.396 216.807 302.13 225.792C295.37 237.813 279.615 252.406 280.401 265.307C286.859 269.604 316.255 246.75 326.297 241.12C335.375 235.292 342.979 247.208 334.182 252.833C280.292 287.458 278.854 291.031 339.276 275.12C346.031 273.089 349.563 283.396 342.38 285.526C309.297 296.792 258.865 311.401 329.432 310.339C340.359 309.693 339.807 319.635 332.87 320.115C316.62 320.786 306.401 320.901 286.182 326.323C254.927 336.125 231.964 357.938 215.703 384.016C226.417 391.203 237.88 398.536 250.156 405.958C320.495 363.438 364.568 323.734 388.688 298.651C406.24 280.396 423.573 260.839 430.25 236.01C441.719 193.375 428.74 153.563 393.724 123.906Z";

type AnimatedLogoProps = {
  className?: string;
};

export function AnimatedLogo({ className }: AnimatedLogoProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 500 500"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="auth-logo-glow"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0.341
                    0 0 1 0 0.133
                    0 0 0 0.9 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.path
        d={LOGO_PATH}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={
          prefersReducedMotion
            ? { pathLength: 1, opacity: 0 }
            : { pathLength: 0, opacity: 1 }
        }
        animate={
          prefersReducedMotion
            ? { pathLength: 1, opacity: 0 }
            : { pathLength: 1, opacity: 0 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                pathLength: { duration: 2.2, ease: [0.65, 0, 0.35, 1] },
                opacity: { duration: 0.24, delay: 1.95, ease: "easeOut" },
              }
        }
      />
      <motion.g
        initial={prefersReducedMotion ? { scale: 1 } : { scale: 1 }}
        animate={
          prefersReducedMotion
            ? { scale: 1 }
            : { scale: [1, 1.045, 1, 1.025, 1] }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                duration: 1.45,
                delay: 2.7,
                ease: "easeInOut",
                times: [0, 0.18, 0.36, 0.54, 1],
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 1.9,
              }
        }
        style={{ originX: 0.5, originY: 0.5 }}
      >
        <motion.path
          d={LOGO_PATH}
          fill="var(--primary)"
          filter="url(#auth-logo-glow)"
          initial={prefersReducedMotion ? { opacity: 0.18 } : { opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.18 }
              : { opacity: [0, 0.24, 0.16, 0.2, 0.16] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 1.45,
                  delay: 1.8,
                  ease: "easeOut",
                  times: [0, 0.24, 0.5, 0.7, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1.9,
                }
          }
        />
        <motion.path
          d={LOGO_PATH}
          fill="var(--primary)"
          initial={
            prefersReducedMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.92 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.5, delay: 1.78, ease: "easeOut" },
                  scale: {
                    duration: 0.68,
                    delay: 1.78,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }
          }
          style={{ originX: 0.5, originY: 0.5 }}
        />
      </motion.g>
    </motion.svg>
  );
}
