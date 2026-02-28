"use client";
import { useEffect, useRef, useState, ReactNode } from "react";

interface LazyLoadSectionProps {
  children: ReactNode;
  /** Skeleton/placeholder to show before the section is in view */
  fallback?: ReactNode;
  /** IntersectionObserver rootMargin (default: loads 200px before visible) */
  rootMargin?: string;
  /** Minimum height for the placeholder to prevent layout shift */
  minHeight?: string;
  className?: string;
}

/**
 * Wraps a section and only renders its children once it enters the viewport.
 * This avoids rendering heavy below-the-fold components on initial load.
 */
export default function LazyLoadSection({
  children,
  fallback,
  rootMargin = "200px",
  minHeight = "200px",
  className = "",
}: LazyLoadSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        children
      ) : (
        fallback ?? <div style={{ minHeight }} />
      )}
    </div>
  );
}
