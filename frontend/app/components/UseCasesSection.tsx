"use client";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "../contexts/ThemeContext";

const UseCasesSection: React.FC = () => {
  const { theme } = useTheme();
  
  const useCases: string[] = [
    "Contract Analysis",
    "Legal Research",
    "Compliance Review",
    "Case Preparation",
    "Client Screening",
    "Document Drafting"
  ];

  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`
            text-3xl sm:text-4xl md:text-5xl font-light mb-6 md:mb-8
            ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
          `}>
            Trusted by Legal Professionals
          </h2>
          <p className={`
            text-lg md:text-xl mb-12 md:mb-16 font-light
            ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}
          `}>
            From solo practitioners to large firms, our AI assistant handles diverse legal challenges
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {useCases.map((useCase, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`
                  px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium transition-colors cursor-default
                  ${theme === 'light' 
                    ? 'bg-white/80 text-slate-700 hover:bg-orange-50 hover:text-orange-700 border border-orange-100/50 backdrop-blur-sm' 
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-orange-400 border border-slate-700/50 backdrop-blur-sm'
                  }
                `}
              >
                {useCase}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;