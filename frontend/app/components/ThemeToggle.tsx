"use client";
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-300 ease-in-out
        ${theme === 'light' 
          ? 'bg-orange-100 hover:bg-orange-200 text-orange-600' 
          : 'bg-slate-700 hover:bg-slate-600 text-blue-400'
        }
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${theme === 'light' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-300
            ${theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
            }
          `} 
        />
        <Moon 
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-300
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
            }
          `} 
        />
      </div>
    </button>
  );
};

export default ThemeToggle;