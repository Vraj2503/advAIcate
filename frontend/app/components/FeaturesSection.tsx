"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, FileText, Shield, Users, LucideIcon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeaturesSection: React.FC = () => {
  const { theme } = useTheme();
  
  const features: Feature[] = [
    {
      icon: Scale,
      title: "Legal Research",
      description: "Get instant access to comprehensive legal databases and case law analysis."
    },
    {
      icon: FileText,
      title: "Document Review",
      description: "Analyze contracts, agreements, and legal documents with AI-powered insights."
    },
    {
      icon: Shield,
      title: "Compliance Check",
      description: "Ensure your business practices meet current legal standards and regulations."
    },
    {
      icon: Users,
      title: "Client Consultation",
      description: "Provide preliminary legal guidance and connect with qualified attorneys."
    }
  ];

  return (
    <section id="features" className="py-12 md:py-16 lg:py-20 xl:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12 lg:mb-16 xl:mb-20">
          <h2 className={`
            text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-3 md:mb-4 lg:mb-6
            ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
          `}>
            Comprehensive Legal Solutions
          </h2>
          <p className={`
            text-base md:text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto font-light
            ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}
          `}>
            Our AI assistant provides specialized tools and insights to streamline your legal workflow
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`
                border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full
                ${theme === 'light' 
                  ? 'bg-white/80 backdrop-blur-sm border border-orange-100/50' 
                  : 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50'
                }
              `}
            >
              <CardContent className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                <div className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 flex-shrink-0
                  ${theme === 'light' 
                    ? 'bg-gradient-to-br from-orange-100 to-amber-100' 
                    : 'bg-gradient-to-br from-orange-600/20 to-amber-600/20'
                  }
                `}>
                  <feature.icon className={`
                    w-5 h-5 sm:w-6 sm:h-6
                    ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'}
                  `} />
                </div>
                <h3 className={`
                  text-base sm:text-lg font-medium mb-2 sm:mb-3 flex-shrink-0
                  ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
                `}>
                  {feature.title}
                </h3>
                <p className={`
                  text-sm sm:text-base leading-relaxed font-light flex-grow
                  ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                `}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;