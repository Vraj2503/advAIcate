"use client";
import dynamic from "next/dynamic";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import LazyLoadSection from "./components/LazyLoadSection";
import SectionSkeleton from "./components/SectionSkeleton";
import { useTheme } from "./contexts/ThemeContext";

// Lazy-load below-the-fold sections — they won't be in the initial JS bundle
const FeaturesSection = dynamic(() => import("./components/FeaturesSection"), {
  loading: () => <SectionSkeleton height="500px" />,
  ssr: false,
});
const UseCasesSection = dynamic(() => import("./components/UseCasesSection"), {
  loading: () => <SectionSkeleton height="400px" />,
  ssr: false,
});
const CTASection = dynamic(() => import("./components/CTASection"), {
  loading: () => <SectionSkeleton height="350px" />,
  ssr: false,
});
const Footer = dynamic(() => import("./components/Footer"), {
  loading: () => <SectionSkeleton height="250px" />,
  ssr: false,
});

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
      <LazyLoadSection rootMargin="300px" minHeight="500px">
        <FeaturesSection />
      </LazyLoadSection>
      <LazyLoadSection rootMargin="300px" minHeight="400px">
        <UseCasesSection />
      </LazyLoadSection>
      <LazyLoadSection rootMargin="200px" minHeight="350px">
        <CTASection />
      </LazyLoadSection>
      <LazyLoadSection rootMargin="200px" minHeight="250px">
        <Footer />
      </LazyLoadSection>
    </div>
  );
}