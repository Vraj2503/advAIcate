"use client";
import { useEffect } from "react";

export default function UrlCleaner() {
  useEffect(() => {
    if (window.location.search.includes("home=true")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);
  return null;
}
