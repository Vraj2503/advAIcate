import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl flex flex-col shadow-2xl border"
        style={{ 
          background: 'var(--doc-bg)', 
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--doc-text)', fontFamily: 'var(--font-serif)' }}>
            Terms and Conditions
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--doc-muted)' }} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 parchment-scroll" style={{ color: 'var(--doc-text)' }}>
          <div className="prose prose-sm max-w-none font-serif leading-relaxed" style={{ fontFamily: 'var(--font-typewriter)' }}>
            <h3 className="text-lg font-bold mb-4">1. Acceptance of Terms</h3>
            <p className="mb-4">
              By accessing and using advAIcate, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>

            <h3 className="text-lg font-bold mb-4 mt-6">2. Description of Service</h3>
            <p className="mb-4">
              advAIcate provides an AI-powered legal assistant for informational purposes only. 
              <strong> The information provided does not constitute legal advice and should not be relied upon as such. </strong>
              You should consult with a qualified legal professional for advice regarding your individual situation.
            </p>

            <h3 className="text-lg font-bold mb-4 mt-6">3. User Data and Privacy</h3>
            <p className="mb-4">
              We respect your privacy and are committed to protecting it. Our Privacy Policy explains how we collect, use, and safeguard your information.
              By using our service, you agree to our data practices as described in the Privacy Policy.
            </p>

            <h3 className="text-lg font-bold mb-4 mt-6">4. Limitation of Liability</h3>
            <p className="mb-4">
              In no event shall advAIcate, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium transition-all text-white"
            style={{ background: 'var(--sealing-wax)' }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
