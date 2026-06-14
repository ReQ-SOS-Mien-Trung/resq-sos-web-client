"use client";

import { useState } from "react";
import { Copy, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const DemoAccounts = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  return (
    <div className="absolute top-6 right-6 z-50">
      <button
        type="button"
        onClick={() => setShowDemoModal(!showDemoModal)}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium tracking-tighter text-zinc-500 hover:text-[#FF5722] dark:text-zinc-400 dark:hover:text-[#FF5722] bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF5722]/50 dark:hover:border-[#FF5722]/50 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
      >
        <span className="tracking-tighter">Tài khoản Demo</span>
      </button>

      <AnimatePresence>
        {showDemoModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowDemoModal(false)}
            />
            {/* Note Popover Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-10 right-0 z-50 w-[320px] sm:w-[360px] overflow-hidden bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-4 text-foreground"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold text-sm tracking-tighter text-zinc-700 dark:text-zinc-300">
                  Tài khoản Demo
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" weight="bold" />
                </button>
              </div>

              {/* Roles list */}
              <div className="space-y-3.5">
                {[
                  {
                    role: "Admin",
                    username: "admin",
                    password: "Admin@123",
                  },
                  {
                    role: "Coordinator",
                    username: "coord03",
                    password: "Coordinator@123",
                  },
                  {
                    role: "Depot Manager",
                    username: "manager01",
                    password: "Manager@123",
                  }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-sm tracking-tighter uppercase font-bold text-zinc-400 dark:text-zinc-500">
                      {item.role}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.username, `tên đăng nhập ${item.role}`)}
                        className="group flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-all cursor-pointer text-sm tracking-tighter"
                      >
                        <span className="truncate text-zinc-600 dark:text-zinc-300 font-mono tracking-tighter font-medium">{item.username}</span>
                        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity text-zinc-500 shrink-0 ml-1" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.password, `mật khẩu ${item.role}`)}
                        className="group flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-all cursor-pointer text-sm tracking-tighter"
                      >
                        <span className="truncate text-zinc-600 dark:text-zinc-300 font-mono tracking-tighter font-medium">{item.password}</span>
                        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity text-zinc-500 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="mt-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-sm tracking-tighter text-center text-zinc-400 dark:text-zinc-500">
                Nhấp để sao chép
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
