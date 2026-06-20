"use client";

import { Scale, LogOut, User, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

const DocumentHeader = () => {
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) return; // don't hide while mobile menu is open
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const pastThreshold = currentScrollY > 80;

      setIsVisible(!(scrollingDown && pastThreshold));
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  return (
    <header
      className="parchment-header sticky top-0 z-50 backdrop-blur-sm"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* ─── Left: Logo ─── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            style={{ textDecoration: "none" }}
          >
            <div
              className="flex items-center justify-center transition-colors duration-200"
              style={{ color: "#D95C14" }}
            >
              <Scale
                className="w-5 h-5 sm:w-6 sm:h-6 group-hover:text-[var(--sealing-wax)] transition-colors duration-200"
              />
            </div>
            <span
              className="text-lg sm:text-2xl tracking-wide"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                color: "#D95C14",
              }}
            >
              advAIcate
            </span>
          </Link>

          {/* ─── Right: Desktop Controls ─── */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {/* Auth Section */}
            {status === "loading" ? (
              <div
                className="w-5 h-5 rounded-full animate-spin"
                style={{
                  borderTopColor: "#D95C14",
                  borderRightColor: "#D95C14",
                  borderBottomColor: "#D95C14",
                  borderLeftColor: "#D95C14",
                  borderWidth: "2px",
                  borderStyle: "solid",
                }}
              />
            ) : session ? (
              <div className="flex items-center gap-3">
                {/* Profile */}
                <div className="flex items-center gap-2">
                  {session.user?.image && !imageError ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={28}
                      height={28}
                      className="rounded-full"
                      style={{
                        borderWidth: "1.5px",
                        borderStyle: "solid",
                        borderColor: "#3A3530",
                      }}
                      onError={() => setImageError(true)}
                      unoptimized
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "var(--onyx-muted)" }}
                    >
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <span
                    className="text-sm hidden lg:inline"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontWeight: 500,
                      color: "#8A8478",
                    }}
                  >
                    {session.user?.name?.split(" ")[0] || "User"}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="parchment-header-icon p-2 rounded-md transition-colors duration-200"
                  aria-label="Sign out"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="signin-link text-sm px-4 py-1.5 rounded-md transition-all duration-200"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
            )}
          </div>

          {/* ─── Right: Mobile Controls ─── */}
          <div className="flex md:hidden items-center gap-2">
            {session && session.user?.image && !imageError ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={24}
                height={24}
                className="rounded-full"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : session ? (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--onyx-muted)" }}
              >
                <User className="w-3 h-3 text-white" />
              </div>
            ) : null}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="parchment-header-icon p-2 rounded-md"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ─── Mobile Menu ─── */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden pt-4 pb-2 mt-3"
            style={{
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: "#3A3530",
            }}
          >
            <div className="flex flex-col gap-2">
              {session ? (
                <>
                  <div
                    className="flex items-center gap-2 px-2 py-2 text-sm"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--foreground)",
                    }}
                  >
                    <User className="w-4 h-4" />
                    {session.user?.name || "User"}
                  </div>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-2 py-2 text-sm rounded-md transition-colors duration-200"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "#8A8478",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </span>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left px-2 py-2 text-sm rounded-md transition-colors duration-200"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: "#8A8478",
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default DocumentHeader;
