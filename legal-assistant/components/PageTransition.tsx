"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Loader from "./ui/Loader";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);

    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, children]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="animate-fade-in">
      {displayChildren}
    </div>
  );
};

export default PageTransition;