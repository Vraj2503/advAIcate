import { motion, AnimatePresence } from "framer-motion";
import { SlideData } from "./slideData";
import { useTheme } from "../contexts/ThemeContext";

interface SlideCardProps {
  slideData: SlideData;
  currentSlide: number;
  slides: SlideData[];
  onSlideChange: (index: number) => void;
}

export const SlideCard = ({ slideData, currentSlide, slides, onSlideChange }: SlideCardProps) => {
  const { theme } = useTheme();
  const IconComponent = slideData.icon;

  return (
    <div className="relative mt-8 lg:mt-0">
      <div className={`
        rounded-2xl shadow-xl p-6 md:p-8 min-h-[450px] relative overflow-hidden
        ${theme === 'light' 
          ? 'bg-white border border-orange-100' 
          : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700'
        }
      `}>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full"
          >
            {/* Query Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shadow
                ${theme === 'light' 
                  ? 'bg-gradient-to-br from-slate-100 to-slate-200' 
                  : 'bg-gradient-to-br from-slate-700 to-slate-600'
                }
              `}>
                <IconComponent className={`
                  w-5 h-5
                  ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}
                `} />
              </div>
              <span className={`
                text-sm md:text-base font-medium
                ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}
              `}>
                {slideData.query}
              </span>
            </div>

            {/* Response */}
            <p className={`
              mb-6 text-sm md:text-base font-medium
              ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
            `}>
              {slideData.response}
            </p>

            {/* Highlights */}
            <div className="space-y-3">
              {slideData.highlights.map((highlight, index) => {
                const currentTheme = theme === 'light' ? highlight.lightTheme : highlight.darkTheme;
                return (
                  <div
                    key={index}
                    className={`
                      ${currentTheme.bgColor} ${currentTheme.borderColor} 
                      border p-4 rounded-xl transition-all duration-200 ease-out cursor-pointer hover:shadow-lg hover:scale-[1.02]
                    `}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className={`font-semibold ${currentTheme.labelColor}`}>
                        {highlight.label}
                      </span>
                      <span className={`${currentTheme.detailColor} font-medium`}>
                        {highlight.detail}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => onSlideChange(index)}
              className={`h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                index === currentSlide
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 w-8 shadow-md'
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 w-8 shadow-md'
                  : theme === 'light'
                    ? 'bg-slate-300 w-2 hover:bg-slate-400'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating Orbs */}
      <div className={`
        absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-80 blur-xl pointer-events-none
        ${theme === 'light' 
          ? 'bg-gradient-to-br from-orange-200 to-amber-200' 
          : 'bg-gradient-to-br from-orange-600/30 to-amber-600/30'
        }
      `} />
      <div className={`
        absolute -bottom-6 -left-6 w-16 h-16 rounded-full opacity-60 blur-lg pointer-events-none
        ${theme === 'light' 
          ? 'bg-gradient-to-br from-orange-300 to-amber-300' 
          : 'bg-gradient-to-br from-orange-700/40 to-amber-700/40'
        }
      `} />
    </div>
  );
};