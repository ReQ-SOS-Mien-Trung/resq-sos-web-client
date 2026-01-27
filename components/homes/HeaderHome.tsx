"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Github } from "lucide-react";
import { useState } from "react";
import { navLinks } from "@/lib/constants";

const HeaderHome = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f11]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo + Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-white">
                ResQ<span className="text-primary">SOS</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium whitespace-nowrap"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right side: CTA Buttons */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 whitespace-nowrap"
            >
              <Github className="w-4 h-4 shrink-0" />
              <span>Star trên GitHub</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-medium">
                2.5K
              </span>
            </a>
            <Button
              className="bg-primary hover:bg-primary/90 text-white px-4 h-9 text-sm font-medium"
              asChild
            >
              <Link href="/sign-in">Đăng nhập</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5 animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium px-2 py-2 rounded-lg hover:bg-white/5"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/5">
                <Button
                  className="bg-primary hover:bg-primary/90 text-white justify-center"
                  asChild
                >
                  <Link href="/sign-in">Đăng nhập</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderHome;
