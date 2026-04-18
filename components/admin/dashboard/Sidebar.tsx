"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CaretDown,
  CaretRight,
  Plus,
  DotsThreeVertical,
  Gear,
  Question,
} from "@phosphor-icons/react";
import { SidebarProps } from "@/type";
import {
  getFavoriteHref,
  getFavoriteIcon,
  navigationItems,
} from "@/lib/constants";

const Sidebar = ({ favorites, projects, isOpen = true }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  // Track which parent nav groups are open (by label)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Auto-open any group whose child matches current pathname
    const initial: Record<string, boolean> = {};
    navigationItems.forEach((item) => {
      if ("children" in item && item.children) {
        const hasActive = item.children.some(
          (c) => pathname === c.href || pathname?.startsWith(c.href),
        );
        if (hasActive) initial[item.label] = true;
      }
    });
    return initial;
  });

  // Re-sync when pathname changes
  useEffect(() => {
    navigationItems.forEach((item) => {
      if ("children" in item && item.children) {
        const hasActive = item.children.some(
          (c) => pathname === c.href || pathname?.startsWith(c.href),
        );
        if (hasActive)
          setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleFavoriteClick = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    const href = getFavoriteHref(name);
    const [basePath, hash] = href.split("#");
    const isOnPage = pathname === basePath;

    const scrollTo = () => {
      if (hash) {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (isOnPage) {
      scrollTo();
    } else {
      router.push(basePath);
      // Wait for page to mount then scroll
      setTimeout(scrollTo, 600);
    }
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64" : "w-0",
      )}
    >
      {isOpen && (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
          {/* Logo & Brand Section */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <Image
                src="/icons/logo.svg"
                alt="ResQ Logo"
                width={36}
                height={36}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Image
                  src="/icons/resq_typo_logo.svg"
                  alt="ResQ SOS"
                  width={80}
                  height={40}
                  className="dark:invert h-auto w-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;

              // ── Group with children ──────────────────────────────────
              if ("children" in item && item.children) {
                const isGroupOpen = !!openGroups[item.label];
                const hasActiveChild = item.children.some(
                  (c) => pathname === c.href || pathname?.startsWith(c.href),
                );
                return (
                  <div key={item.label}>
                    {/* Parent button */}
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-200",
                        hasActiveChild
                          ? "text-red-600 dark:text-red-400"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Icon
                        size={20}
                        className={cn(
                          "transition-colors shrink-0",
                          hasActiveChild && "text-red-500",
                        )}
                      />
                      <span className="truncate tracking-tighter flex-1 text-left">
                        {item.label}
                      </span>
                      <CaretDown
                        size={14}
                        className={cn(
                          "shrink-0 transition-transform duration-200",
                          isGroupOpen ? "rotate-0" : "-rotate-90",
                        )}
                      />
                    </button>

                    {/* Children */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        isGroupOpen
                          ? "max-h-96 opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="ml-3 mt-0.5 border-l border-sidebar-border/60 pl-2 space-y-0.5">
                        {item.children.map((child, cIdx) => {
                          const ChildIcon = child.icon;
                          const isActive =
                            pathname === child.href ||
                            (child.href !== "/dashboard/admin" &&
                              pathname?.startsWith(child.href));
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-none text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-linear-to-r from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 shadow-sm border border-red-500/10"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1",
                              )}
                              style={{ animationDelay: `${cIdx * 40}ms` }}
                            >
                              <ChildIcon
                                size={16}
                                className={cn(
                                  "transition-colors shrink-0",
                                  isActive && "text-red-500",
                                )}
                              />
                              <span className="truncate tracking-tighter">
                                {child.label}
                              </span>
                              {isActive && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Regular flat item ────────────────────────────────────
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard/admin" &&
                  pathname?.startsWith(item.href as string));
              return (
                <Link
                  key={item.label}
                  href={item.href as string}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-linear-to-r from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 shadow-sm border border-red-500/10"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors shrink-0",
                      isActive && "text-red-500",
                    )}
                  />
                  <span className="truncate tracking-tighter">
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  )}
                </Link>
              );
            })}

            {/* Favorites Section */}
            <div className="mt-6 pt-4 border-t border-sidebar-border/50">
              <button
                onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm tracking-tighter font-semibold text-sidebar-foreground/50 uppercase hover:text-sidebar-foreground transition-colors"
              >
                <span>Thống kê nhanh</span>
                <div className="flex items-center gap-1.5">
                  <Plus
                    size={14}
                    className="hover:text-red-500 transition-colors"
                  />
                  <DotsThreeVertical size={14} />
                  <CaretDown
                    size={14}
                    className={cn(
                      "transition-transform duration-200",
                      !favoritesExpanded && "-rotate-90",
                    )}
                  />
                </div>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  favoritesExpanded
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="mt-1 space-y-0.5">
                  {favorites.map((favorite, index) => {
                    const Icon = getFavoriteIcon(favorite.name);
                    return (
                      <Link
                        key={favorite.id}
                        href={getFavoriteHref(favorite.name)}
                        onClick={(e) => handleFavoriteClick(e, favorite.name)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={16}
                            className="text-sidebar-foreground/50 group-hover:text-red-500 transition-colors"
                          />
                          <span>{favorite.name}</span>
                        </div>
                        <span className="text-sm tracking-tighter font-medium px-2 py-0.5 rounded-full bg-sidebar-accent text-sidebar-foreground/60 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                          {favorite.count.toLocaleString()}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="mt-4">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm tracking-tighter font-semibold text-sidebar-foreground/50 uppercase hover:text-sidebar-foreground transition-colors"
              >
                <span>Khu vực cứu hộ</span>
                <div className="flex items-center gap-1.5">
                  <Plus
                    size={14}
                    className="hover:text-red-500 transition-colors"
                  />
                  <DotsThreeVertical size={14} />
                  <CaretDown
                    size={14}
                    className={cn(
                      "transition-transform duration-200",
                      !projectsExpanded && "-rotate-90",
                    )}
                  />
                </div>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  projectsExpanded
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="mt-1 space-y-0.5">
                  {projects.map((project, index) => (
                    <Link
                      key={project.id}
                      href="#"
                      className="block px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Bottom Links - Fixed at bottom */}
          <div className="shrink-0 p-3 pb-16 border-t border-sidebar-border space-y-0.5">
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Gear
                  size={16}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
                <span>Cài đặt</span>
              </div>
              <CaretRight
                size={16}
                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              />
            </Link>
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Question size={16} />
                <span>Trung tâm hỗ trợ</span>
              </div>
              <CaretRight
                size={16}
                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
