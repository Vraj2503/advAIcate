"use client";
import { Scale } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface FooterLink {
  name: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const Footer: React.FC = () => {
  const { theme } = useTheme();
  
  const footerSections: FooterSection[] = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#" },
        { name: "Pricing", href: "#" },
        { name: "API", href: "#" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Contact", href: "#" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy", href: "#" },
        { name: "Terms", href: "#" },
        { name: "Security", href: "#" }
      ]
    }
  ];

  return (
    <footer className={`
      py-8 md:py-10
      ${theme === 'light' 
        ? 'bg-white/90 border-orange-200' 
        : 'bg-slate-900/90 border-slate-700'
      } 
      border-t shadow-xl backdrop-blur-md
    `}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-3 md:mb-4">
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center
                ${theme === 'light' ? 'bg-orange-600' : 'bg-orange-600'}
              `}>
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className={`
                text-xl font-bold tracking-tight font-sans
                ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
              `}>
                advAIcate
              </span>
            </div>
            <p className={`
              text-sm leading-relaxed font-light max-w-xs
              ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
            `}>
              Empowering legal professionals with intelligent AI assistance for better outcomes.
            </p>
          </div>
          
          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index} className="space-y-3">
              <h4 className={`
                font-medium mb-3
                ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}
              `}>
                {section.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className={`
                        transition-colors
                        ${theme === 'light' 
                          ? 'text-slate-700 hover:text-orange-600' 
                          : 'text-slate-300 hover:text-orange-400'
                        }
                      `}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className={`
          border-t mt-6 md:mt-8 pt-4 md:pt-6 text-center text-sm
          ${theme === 'light' 
            ? 'border-orange-200 text-slate-600' 
            : 'border-slate-700 text-slate-400'
          }
        `}>
          <p>&copy; 2025 advAIcate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;