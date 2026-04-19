"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SOSDetailsPanelShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  width?: number;
  children?: ReactNode;
}

const LOCK_COUNTER_ATTR = "data-sos-panel-shell-lock-count";
const PREV_BODY_OVERFLOW_ATTR = "data-sos-panel-shell-prev-body-overflow";
const PREV_HTML_OVERFLOW_ATTR = "data-sos-panel-shell-prev-html-overflow";
const PREV_BODY_PADDING_RIGHT_ATTR =
  "data-sos-panel-shell-prev-body-padding-right";
const TARGET_PREV_OVERFLOW_ATTR = "data-sos-panel-shell-prev-overflow";
const TARGET_LOCK_COUNTER_ATTR = "data-sos-panel-shell-target-lock-count";
const LOCK_TARGET_SELECTOR =
  "[data-dashboard-main-scroll],[data-scroll-lock-root]";

function lockElementOverflow(element: HTMLElement) {
  const currentCount = Number(
    element.getAttribute(TARGET_LOCK_COUNTER_ATTR) ?? "0",
  );

  if (currentCount === 0) {
    element.setAttribute(TARGET_PREV_OVERFLOW_ATTR, element.style.overflow);
    element.style.overflow = "hidden";
  }

  element.setAttribute(TARGET_LOCK_COUNTER_ATTR, String(currentCount + 1));
}

function unlockElementOverflow(element: HTMLElement) {
  const currentCount = Number(
    element.getAttribute(TARGET_LOCK_COUNTER_ATTR) ?? "1",
  );
  const nextCount = Math.max(0, currentCount - 1);

  if (nextCount === 0) {
    element.style.overflow =
      element.getAttribute(TARGET_PREV_OVERFLOW_ATTR) ?? "";
    element.removeAttribute(TARGET_PREV_OVERFLOW_ATTR);
    element.removeAttribute(TARGET_LOCK_COUNTER_ATTR);
    return;
  }

  element.setAttribute(TARGET_LOCK_COUNTER_ATTR, String(nextCount));
}

const SOSDetailsPanelShell = ({
  open,
  onOpenChange,
  width = 420,
  children,
}: SOSDetailsPanelShellProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mounted, onOpenChange, open]);

  useEffect(() => {
    if (!mounted || !open) return;

    const html = document.documentElement;
    const body = document.body;
    const activeLocks = Number(html.getAttribute(LOCK_COUNTER_ATTR) ?? "0");

    if (activeLocks === 0) {
      html.setAttribute(PREV_HTML_OVERFLOW_ATTR, html.style.overflow);
      body.setAttribute(PREV_BODY_OVERFLOW_ATTR, body.style.overflow);
      body.setAttribute(PREV_BODY_PADDING_RIGHT_ATTR, body.style.paddingRight);

      const scrollbarWidth = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    html.setAttribute(LOCK_COUNTER_ATTR, String(activeLocks + 1));

    const lockTargets = Array.from(
      document.querySelectorAll<HTMLElement>(LOCK_TARGET_SELECTOR),
    );
    lockTargets.forEach(lockElementOverflow);

    return () => {
      lockTargets.forEach(unlockElementOverflow);

      const currentLocks = Number(html.getAttribute(LOCK_COUNTER_ATTR) ?? "1");
      const nextLocks = Math.max(0, currentLocks - 1);

      if (nextLocks === 0) {
        html.style.overflow = html.getAttribute(PREV_HTML_OVERFLOW_ATTR) ?? "";
        body.style.overflow = body.getAttribute(PREV_BODY_OVERFLOW_ATTR) ?? "";
        body.style.paddingRight =
          body.getAttribute(PREV_BODY_PADDING_RIGHT_ATTR) ?? "";

        html.removeAttribute(LOCK_COUNTER_ATTR);
        html.removeAttribute(PREV_HTML_OVERFLOW_ATTR);
        body.removeAttribute(PREV_BODY_OVERFLOW_ATTR);
        body.removeAttribute(PREV_BODY_PADDING_RIGHT_ATTR);
        return;
      }

      html.setAttribute(LOCK_COUNTER_ATTR, String(nextLocks));
    };
  }, [mounted, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-1000 transition-opacity duration-300",
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="Đóng chi tiết SOS"
        className="absolute inset-0 z-0 bg-black/80"
        onClick={() => onOpenChange(false)}
        onWheel={(event) => {
          event.preventDefault();
        }}
        onTouchMove={(event) => {
          event.preventDefault();
        }}
      />

      <div
        className={cn(
          "absolute top-0 right-0 z-10 h-full transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width }}
      >
        <section
          role="dialog"
          aria-modal="true"
          className="h-full min-h-0 bg-background border-l shadow-2xl flex flex-col"
        >
          {children}
        </section>
      </div>
    </div>,
    document.body,
  );
};

export default SOSDetailsPanelShell;
