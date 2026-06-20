"use client";

import Link from "next/link";
import { useCallback } from "react";

/*
 * ─── Redacted Document Body ─────────────────────────────────────────────────
 * Light parchment document sitting on a dark page background.
 * Dark onyx redaction bars on warm parchment — same high-contrast look.
 * On hover the bar flashes orange and dissolves to reveal text.
 * Once revealed, text stays visible permanently (sticky reveal).
 *
 * On mobile (≤768 px) all bars are removed — text shown immediately.
 *
 * The CTA "START CONSULTATION" is an orange redaction bar linked to /chat.
 * ────────────────────────────────────────────────────────────────────────────
 */

interface RedactionBarProps {
  children: React.ReactNode;
}

/** A decorative redaction bar that reveals text on hover — stays revealed */
const Redacted = ({ children }: RedactionBarProps) => {
  const handleReveal = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.classList.add("revealed");
  }, []);

  return (
    <span className="redaction-bar" onMouseEnter={handleReveal}>
      <span>{children}</span>
    </span>
  );
};

const RedactedDocument = () => {
  const handleCtaReveal = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.classList.add("revealed");
    },
    []
  );

  return (
    <main
      className="flex-1 flex items-start justify-center px-2 sm:px-4 py-4 sm:py-6 lg:py-8 parchment-scroll"
      style={{ minHeight: "calc(100vh - 60px)" }}
    >
      <div className="document-container animate-page-entry w-full">
        {/* ─── Photocopy Overlays ─── */}
        <div className="document-container-toner" />
        <div className="document-container-grain" />

        {/* ─── Watermark ─── */}
        <div
          className="watermark-stamp animate-stamp absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 0 }}
        >
          <span
            className="text-6xl sm:text-8xl font-bold tracking-widest"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--onyx)",
              transform: "rotate(-18deg)",
              opacity: "inherit",
              userSelect: "none",
            }}
          >
            CONFIDENTIAL
          </span>
        </div>

        {/* ─── Document Content ─── */}
        <div className="relative" style={{ zIndex: 1 }}>
          {/* Header Block */}
          <div
            className="doc-line text-center mb-8 sm:mb-10 pb-6 sm:pb-8"
            style={{
              animationDelay: "0.1s",
              borderBottomWidth: "2px",
              borderBottomStyle: "solid",
              borderBottomColor: "var(--doc-border)",
            }}
          >
            <p
              className="text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-3"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--doc-muted)",
                letterSpacing: "0.3em",
              }}
            >
              Office of Legal Intelligence • Private & Confidential
            </p>
            <h1
              className="text-xl sm:text-2xl lg:text-3xl mb-2 leading-tight"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                color: "var(--doc-text)",
              }}
            >
              CASE FILE: advAIcate v. Legal Complexity
            </h1>
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-4 text-[11px] sm:text-xs"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-muted)",
              }}
            >
              <span>Case No. <Redacted>2025-ADV-0742</Redacted></span>
              <span className="hidden sm:inline">•</span>
              <span>Filed: <Redacted>December 14, 2025</Redacted></span>
              <span className="hidden sm:inline">•</span>
              <span>Status: <Redacted>ACTIVE</Redacted></span>
            </div>
          </div>

          {/* ─── Paragraph 1 ─── */}
          <div
            className="doc-line mb-6"
            style={{ animationDelay: "0.2s" }}
          >
            <p
              className="text-sm sm:text-[15px] leading-[2] sm:leading-[2.1]"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-text)",
                textShadow: "0 0 0.4px rgba(26, 26, 26, 0.3)",
              }}
            >
              WHEREAS the party of the first part, hereinafter referred to as
              the &quot;User,&quot; seeks legal guidance on matters pertaining to{" "}
              <Redacted>intellectual property disputes</Redacted>,{" "}
              <Redacted>contractual obligations</Redacted>, and other complex
              legal proceedings; and WHEREAS the party of the second part,
              known as <Redacted>advAIcate AI</Redacted>, possesses the
              capability to deliver{" "}
              <Redacted>privacy-first artificial intelligence</Redacted>{" "}
              assistance powered by{" "}
              <Redacted>state-of-the-art language models</Redacted>;
            </p>
          </div>

          {/* ─── Paragraph 2 ─── */}
          <div
            className="doc-line mb-6"
            style={{ animationDelay: "0.35s" }}
          >
            <p
              className="text-sm sm:text-[15px] leading-[2] sm:leading-[2.1]"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-text)",
                textShadow: "0 0 0.4px rgba(26, 26, 26, 0.3)",
              }}
            >
              IT IS HEREBY ESTABLISHED that the aforementioned AI counsel shall
              provide general legal information, document analysis, and case
              research assistance to{" "}
              <Redacted>licensed practitioners and individuals</Redacted>{" "}
              seeking to navigate{" "}
              <Redacted>the Indian legal system</Redacted> with greater
              clarity and confidence. All consultations shall be conducted with{" "}
              <Redacted>end-to-end encryption</Redacted> and in strict
              accordance with applicable data protection statutes.
            </p>
          </div>

          {/* ─── Paragraph 3 ─── */}
          <div
            className="doc-line mb-6"
            style={{ animationDelay: "0.5s" }}
          >
            <p
              className="text-sm sm:text-[15px] leading-[2] sm:leading-[2.1]"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-text)",
                textShadow: "0 0 0.4px rgba(26, 26, 26, 0.3)",
              }}
            >
              SECTION III — SCOPE OF SERVICES: The AI assistant shall be
              competent to discuss matters including but not limited to{" "}
              <Redacted>tenant rights and housing disputes</Redacted>,{" "}
              <Redacted>employment law and workplace grievances</Redacted>,{" "}
              <Redacted>consumer protection statutes</Redacted>, and{" "}
              <Redacted>startup incorporation requirements</Redacted>. The
              system employs <Redacted>Llama 4 architecture</Redacted> to
              deliver responses grounded in{" "}
              <Redacted>current legal precedent</Redacted>.
            </p>
          </div>

          {/* ─── CTA Line (disguised as redaction bar) ─── */}
          <div
            className="doc-line mb-6"
            style={{ animationDelay: "0.65s" }}
          >
            <p
              className="text-sm sm:text-[15px] leading-[2] sm:leading-[2.1]"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-text)",
                textShadow: "0 0 0.4px rgba(26, 26, 26, 0.3)",
              }}
            >
              PURSUANT to the terms outlined herein, the User may initiate
              proceedings by executing the following directive:{" "}
              <Link
                href="/chat"
                prefetch={true}
                className="redaction-bar redaction-bar-cta"
                style={{ textDecoration: "none" }}
                onMouseEnter={handleCtaReveal}
              >
                <span>START CONSULTATION</span>
              </Link>
              . Failure to commence within the allotted timeframe may result
              in <Redacted>automatic case reassignment</Redacted>.
            </p>
          </div>

          {/* ─── Paragraph 4 ─── */}
          <div
            className="doc-line mb-6"
            style={{ animationDelay: "0.8s" }}
          >
            <p
              className="text-sm sm:text-[15px] leading-[2] sm:leading-[2.1]"
              style={{
                fontFamily: "var(--font-typewriter)",
                color: "var(--doc-text)",
                textShadow: "0 0 0.4px rgba(26, 26, 26, 0.3)",
              }}
            >
              ARTICLE V — DISCLAIMER: This system provides{" "}
              <Redacted>general legal information only</Redacted> and does not
              constitute legal advice. No attorney-client relationship is
              formed through use of this service. For specific legal matters,
              users are advised to consult with{" "}
              <Redacted>a qualified legal professional</Redacted> in their
              jurisdiction. All outputs are generated by{" "}
              <Redacted>artificial intelligence</Redacted> and should be
              independently verified.
            </p>
          </div>

          {/* ─── Signature Block ─── */}
          <div
            className="doc-line mt-10 sm:mt-14 pt-6 sm:pt-8"
            style={{
              animationDelay: "0.95s",
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: "var(--doc-border)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-4 relative pr-10 sm:pr-16">
              <div>
                {/* ─── Signature CTA ─── */}
                <Link
                  href="/chat"
                  prefetch={true}
                  className="signature-cta-btn block"
                  aria-label="Start consultation"
                >
                  BEGIN CONSULTATION
                </Link>
                <div
                  className="mb-2"
                  style={{
                    borderBottomWidth: "1.5px",
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--onyx)",
                    width: "180px",
                    height: "28px",
                  }}
                />
                <p
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-typewriter)",
                    color: "var(--doc-muted)",
                  }}
                >
                  Authorized Signature
                </p>
              </div>
              <div className="text-right sm:text-right">
                <p
                  className="text-xs mb-1"
                  style={{
                    fontFamily: "var(--font-typewriter)",
                    color: "var(--doc-muted)",
                  }}
                >
                  Document ID: ADV-2025-0742
                </p>
                <p
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-typewriter)",
                    color: "var(--doc-muted)",
                  }}
                >
                  Classification: <span style={{ color: "var(--sealing-wax)", fontWeight: 700 }}>RESTRICTED</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RedactedDocument;
