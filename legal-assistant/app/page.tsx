"use client";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import UseCasesSection from "./components/UseCasesSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import { useTheme } from "./contexts/ThemeContext";

export default function HomePage() {
  const { theme } = useTheme();

  return (
    <div className={`
      min-h-screen
      ${theme === 'light' 
        ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50' 
        : 'bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900'
      }
    `}>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <UseCasesSection />
      <Footer />
    </div>
  );
}