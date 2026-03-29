"use client";
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onCharacterAdded?: () => void;
  className?: string;
}

export const TypewriterText = ({ 
  text, 
  speed = 30, 
  onComplete, 
  onCharacterAdded,
  className = "" 
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme } = useTheme();
  const isLight = theme === "light";

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        if (onCharacterAdded) {
          onCharacterAdded();
        }
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onCharacterAdded]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className={className}>
      <div className={`whitespace-pre-line leading-relaxed ${
        isLight ? 'text-slate-700' : 'text-slate-300'
      }`}>
        {displayedText}
      </div>
    </div>
  );
};