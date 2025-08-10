"use client";
import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onCharacterAdded?: () => void; // Add this new prop
  className?: string;
}

export const TypewriterText = ({ 
  text, 
  speed = 30, 
  onComplete, 
  onCharacterAdded, // Add this
  className = "" 
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        // Call the callback on each character added
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
      <div className="whitespace-pre-line leading-relaxed">
        {displayedText}
      </div>
    </div>
  );
};