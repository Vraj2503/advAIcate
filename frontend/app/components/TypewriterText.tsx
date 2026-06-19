"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onCharacterAdded?: () => void;
  isStopped?: boolean;
  className?: string;
}

export const TypewriterText = ({
  text,
  speed = 5,
  onComplete,
  onCharacterAdded,
  isStopped = false,
  className = "",
}: TypewriterTextProps) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [finished, setFinished] = useState(false);
  const isLight = false; // dark-only theme

  const workerRef = useRef<Worker | null>(null);
  const textRef = useRef(text);
  const lengthRef = useRef(0);
  const completedRef = useRef(false);

  // Keep textRef in sync
  textRef.current = text;

  // ---- Create / destroy worker ----
  useEffect(() => {
    const w = new Worker("/timerWorker.js");
    workerRef.current = w;

    w.onmessage = () => {
      if (completedRef.current) return;

      const nextLen = lengthRef.current + 1;
      if (nextLen <= textRef.current.length) {
        lengthRef.current = nextLen;
        setDisplayedLength(nextLen);
        onCharacterAdded?.();
      }

      if (nextLen >= textRef.current.length) {
        completedRef.current = true;
        w.postMessage({ cmd: "stop" });
        setFinished(true);
        onComplete?.();
      }
    };

    w.postMessage({ cmd: "start", interval: speed });

    return () => {
      w.postMessage({ cmd: "stop" });
      w.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  // ---- Handle stop ----
  useEffect(() => {
    if (isStopped && !completedRef.current) {
      completedRef.current = true;
      workerRef.current?.postMessage({ cmd: "stop" });
      lengthRef.current = textRef.current.length;
      setDisplayedLength(textRef.current.length);
      setFinished(true);
      onComplete?.();
    }
  }, [isStopped, onComplete]);

  // Reset when text changes
  useEffect(() => {
    lengthRef.current = 0;
    completedRef.current = false;
    setDisplayedLength(0);
    setFinished(false);
  }, [text]);

  const displayedText = text.slice(0, displayedLength);

  return (
    <div className={className}>
      <div className={`bot-markdown leading-relaxed ${isLight ? "light" : "dark"}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {displayedText}
        </ReactMarkdown>
        {!finished && (
          <span className="typewriter-cursor" />
        )}
      </div>
    </div>
  );
};
