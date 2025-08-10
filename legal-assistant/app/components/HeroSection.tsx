"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { SlideCard } from "./SlideCard";
import { slides } from "./slideData";

const HeroSection: React.FC = () => {
  const { theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="container mx-auto px-4 py-9 md:py-12 lg:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Column */}
          <div className="text-center lg:text-left">
            <Badge className={`
              mb-6 md:mb-8 font-medium inline-flex items-center shadow-sm hover:shadow-md transition-shadow duration-300
              ${theme === 'light' 
                ? 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-200' 
                : 'bg-gradient-to-r from-orange-950/60 to-amber-950/60 text-orange-300 border-orange-700/50'
              }
            `}>
              <Zap className="w-3 h-3 mr-1 animate-pulse" />
              Powered by Llama 4
            </Badge>

            <h1 className={`
              text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-6 md:mb-8 leading-tight
              ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
            `}>
              Your legal ideas,
              <span className={`
                block font-normal bg-clip-text text-transparent
                ${theme === 'light' 
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600' 
                  : 'bg-gradient-to-r from-orange-500 to-amber-500'
                }
              `}>
                amplified
              </span>
            </h1>

            <p className={`
              text-lg md:text-xl mb-8 md:mb-12 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0
              ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}
            `}>
              Privacy-first AI that helps you navigate legal matters with confidence and clarity.
            </p>

            <div className="space-y-4">
              <Link href="/chat" prefetch={true}>
                <Button size="lg" className={`
                  w-full sm:w-auto text-white text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group
                  ${theme === 'light' 
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700' 
                    : 'bg-transparent border-2 border-amber-600'
                  }
                `}>
                  {/* Sweeping gradient overlay - only in dark mode */}
                  {theme === 'dark' && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-orange-600 via-amber-600 to-transparent" />
                  )}
                  
                  {/* Button content */}
                  <div className="relative z-10 flex items-center justify-center">
                    <MessageSquare className="w-4 md:w-5 h-4 md:h-5 mr-2" />
                    Start Legal Consultation
                  </div>
                </Button>
              </Link>

              <div className="text-center sm:text-left pt-2">
                <span className={`
                  text-sm font-medium
                  ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}
                `}>
                  OR
                </span>
              </div>

              <Button size="lg" className={`
                sm:w-auto text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-medium
                ${theme === 'light' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                }
              `}>
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Right Column - Slideshow */}
          <SlideCard 
            slideData={slides[currentSlide]}
            currentSlide={currentSlide}
            slides={slides}
            onSlideChange={setCurrentSlide}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;