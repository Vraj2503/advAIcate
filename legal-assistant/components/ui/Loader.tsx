import { Scale } from "lucide-react";

const Loader = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative">
          {/* Animated scales icon */}
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-8">
            <Scale className="w-12 h-12 text-orange-500 animate-pulse" />
          </div>
          
          {/* Loading dots */}
          <div className="flex justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
          
          <p className="text-orange-500 font-light text-lg">Loading Legal Assistant...</p>
        </div>
      </div>
    </div>
  );
};

export default Loader;