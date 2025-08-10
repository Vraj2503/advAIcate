"use client";

import { Button } from "@/components/ui/button";
import { Scale, Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";

interface HeaderProps {
  isChat?: boolean;
}

const Header = ({ isChat = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const isLight = theme === 'light';

  return (
    <header className={`${isLight ? 'bg-white/90 border-orange-200' : 'bg-slate-900/40 border-slate-700'} border-b shadow-xl sticky top-0 z-50 backdrop-blur-md`}>
      <div className="container mx-auto px-4 py-4 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-orange-600' : 'bg-blue-600'}`}>
              <Scale className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className={`text-lg md:text-xl font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              advAIcate
            </span>
          </Link>

          {/* Center */}
          {isChat ? (
            <div className="hidden lg:block text-center">
              <h1 className={`text-lg xl:text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Legal AI Assistant
              </h1>
              <p className={`text-xs xl:text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Powered by LLaMA 4 • General information only
              </p>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link href="/aboutus" className={`transition-colors text-sm lg:text-base font-medium ${isLight ? 'text-slate-700 hover:text-orange-600' : 'text-white hover:text-orange-500'}`}>
                About
              </Link>
              <Link href="/contactus" className={`transition-colors text-sm lg:text-base font-medium ${isLight ? 'text-slate-700 hover:text-orange-600' : 'text-white hover:text-orange-500'}`}>
                Contact
              </Link>
            </div>
          )}

          {/* Desktop Right */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <ThemeToggle />
            {status === "loading" ? (
              <div className={`w-6 h-6 md:w-8 md:h-8 border-2 rounded-full animate-spin ${isLight ? 'border-orange-300 border-t-orange-600' : 'border-slate-600 border-t-blue-500'}`} />
            ) : session ? (
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="flex items-center space-x-2">
                  {session.user?.image && !imageError ? (
                    <Image 
                      src={session.user.image} 
                      alt={session.user.name || "User"} 
                      width={32} 
                      height={32} 
                      className={`rounded-full w-6 h-6 lg:w-8 lg:h-8 ${isLight ? 'border border-orange-200' : 'border border-slate-600'}`} 
                      onError={() => setImageError(true)} 
                      unoptimized 
                    />
                  ) : (
                    <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center ${isLight ? 'bg-orange-600' : 'bg-blue-600'}`}>
                      <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                  )}
                  <span className={`text-xs lg:text-sm font-medium hidden lg:block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {session.user?.name?.split(" ")[0] || "User"}
                  </span>
                </div>
                {!isChat && (
                  <Link href="/chat">
                    <Button size="sm" className={`text-white font-medium text-xs lg:text-sm border-0 ${isLight ? 'bg-orange-600 hover:bg-orange-700' : 'bg-transparent border-1 border-amber-600 hover:bg-gradient-to-r hover:from-orange-700 hover:to-amber-600'}`}>
                      Chat
                    </Button>
                  </Link>
                )}
                <Button 
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  variant="outline" 
                  size="sm" 
                  className={`p-1 lg:p-2 ${isLight ? 'text-slate-600 hover:text-slate-800 border-slate-300' : 'text-slate-400 hover:text-slate-200 border-slate-600'}`}
                >
                  <LogOut className="w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 lg:space-x-3">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm" className={`text-xs lg:text-sm`}>
                    Sign In
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button size="sm" className={`text-white font-medium text-xs lg:text-sm border-0 ${isLight ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
            {session && (
              <div className="flex items-center space-x-2">
                {session.user?.image ? (
                  <Image 
                    src={session.user.image} 
                    alt={session.user.name || "User"} 
                    width={24} 
                    height={24} 
                    className="w-6 h-6 rounded-full" 
                    unoptimized 
                  />
                ) : (
                  <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile chat title */}
        {isChat && (
          <div className="lg:hidden text-center">
            <h1 className={`text-base font-medium ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Legal AI Assistant
            </h1>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className={`md:hidden ${isLight ? 'bg-white border-t border-orange-100' : 'bg-slate-800 border-t border-slate-700'}`}>
          <nav className="container mx-auto px-4 py-4 space-y-3">
            {!isChat && (
              <>
                <Link href="/aboutus" onClick={() => setIsMenuOpen(false)} className={`block transition-colors font-medium py-2 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-slate-100'}`}>
                  About Us
                </Link>
                <Link href="/contactus" onClick={() => setIsMenuOpen(false)} className={`block transition-colors font-medium py-2 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-slate-100'}`}>
                  Contact Us
                </Link>
              </>
            )}

            {session ? (
              <div className={`${!isChat ? `pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-600'}` : ""}`}>
                <div className="flex items-center space-x-3 mb-4">
                  {session.user?.image ? (
                    <Image 
                      src={session.user.image} 
                      alt={session.user.name || "User"} 
                      width={32} 
                      height={32} 
                      className="w-8 h-8 rounded-full" 
                      unoptimized 
                    />
                  ) : (
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {session.user?.name || "User"}
                  </span>
                </div>
                {!isChat && (
                  <Link href="/chat" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium mb-3">
                      Go to Chat
                    </Button>
                  </Link>
                )}
                <Button 
                  onClick={() => { 
                    signOut({ callbackUrl: '/' }); 
                    setIsMenuOpen(false); 
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className={`${!isChat ? `pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-600'}` : ""}`}>
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full mb-3">Sign In</Button>
                </Link>
                <Link href="/chat" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium">Get Started</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;