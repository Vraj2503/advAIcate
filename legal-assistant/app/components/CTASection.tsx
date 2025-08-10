"use client";
import { Button } from "@/components/ui/button";
import { useTheme } from "../contexts/ThemeContext";
import { MessageSquare, Calendar } from "lucide-react";

const CTASection: React.FC = () => {
  const { theme } = useTheme();

  return (
    <section className={`
      py-16 md:py-20 lg:py-24
      ${theme === 'light'
        ? 'bg-gradient-to-r from-orange-600 to-amber-600'
        : 'bg-gradient-to-r from-slate-800/20 to-slate-700/20'
      }
    `}>
      <div className="container mx-auto px-4 text-center">
        <h2 className={`
          text-3xl sm:text-4xl md:text-5xl font-light mb-6 md:mb-8
          ${theme === 'light' ? 'text-white' : 'text-white'}
        `}>
          Ready to Transform Your Legal Practice?
        </h2>
        <p className={`
          text-lg md:text-xl mb-8 md:mb-12 max-w-3xl mx-auto font-light
          ${theme === 'light' ? 'text-orange-100' : 'text-slate-300'}
        `}>
          Join thousands of legal professionals who trust our AI assistant for accurate, efficient legal support.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center max-w-md sm:max-w-none mx-auto">
          <Button
            size="lg"
            className={`
              text-base md:text-lg px-8 md:px-10 py-3 md:py-4 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-0
              ${theme === 'light'
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-orange-700 hover:bg-slate-100'
                : 'bg-transparent border-2 border-amber-600 hover:bg-gradient-to-r hover:from-orange-700 hover:to-amber-600'

              }
            `}
          >
            <MessageSquare className="w-4 md:w-5 h-4 md:h-5 mr-2" />
            Start Free Trial
          </Button>
          <Button
            size="lg"
            className={`
              text-base md:text-lg px-8 md:px-10 py-3 md:py-4 font-medium transition-all duration-300
              ${theme === 'light'
                ? 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-orange-700'
                : 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900'
              }
            `}
          >
            <Calendar className="w-4 md:w-5 h-4 md:h-5 mr-2" />
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;