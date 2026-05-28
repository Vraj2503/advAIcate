import { Users, FileText, Scale, Shield, LucideIcon } from "lucide-react";

export interface HighlightTheme {
  bgColor: string;
  borderColor: string;
  labelColor: string;
  detailColor: string;
}

export interface Highlight {
  label: string;
  detail: string;
  lightTheme: HighlightTheme;
  darkTheme: HighlightTheme;
}

export interface SlideData {
  icon: LucideIcon;
  query: string;
  response: string;
  highlights: Highlight[];
}

export const slides: SlideData[] = [
  {
    icon: Users,
    query: "Legal Assistant, analyze my contract terms.",
    response: "Of course! I've reviewed your contract and identified several key areas:",
    highlights: [
      {
        label: "Payment Terms:",
        detail: "Net 30 days with 2% early payment discount",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-orange-50 to-orange-100",
          borderColor: "border-orange-200",
          labelColor: "text-orange-900",
          detailColor: "text-orange-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      },
      {
        label: "Liability Cap:",
        detail: "Limited to contract value",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-amber-50 to-amber-100",
          borderColor: "border-amber-200",
          labelColor: "text-amber-900",
          detailColor: "text-amber-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-sky-900/20 to-blue-900/20",
          borderColor: "border-sky-600/40",
          labelColor: "text-sky-300",
          detailColor: "text-sky-200"
        }
      },
      {
        label: "Termination:",
        detail: "30-day notice required",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-yellow-50 to-yellow-100",
          borderColor: "border-yellow-200",
          labelColor: "text-yellow-900",
          detailColor: "text-yellow-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      }
    ]
  },
  {
    icon: FileText,
    query: "Help me draft a privacy policy for my startup.",
    response: "I'll help you create a comprehensive privacy policy. Here are the essential sections:",
    highlights: [
      {
        label: "Data Collection:",
        detail: "What information you gather from users",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-blue-50 to-blue-100",
          borderColor: "border-blue-200",
          labelColor: "text-blue-900",
          detailColor: "text-blue-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-sky-900/20 to-blue-900/20",
          borderColor: "border-sky-600/40",
          labelColor: "text-sky-300",
          detailColor: "text-sky-200"
        }
      },
      {
        label: "Usage Rights:",
        detail: "How you process and store data",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-indigo-50 to-indigo-100",
          borderColor: "border-indigo-200",
          labelColor: "text-indigo-900",
          detailColor: "text-indigo-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      },
      {
        label: "User Controls:",
        detail: "Rights to access, modify, delete data",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-purple-50 to-purple-100",
          borderColor: "border-purple-200",
          labelColor: "text-purple-900",
          detailColor: "text-purple-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      }
    ]
  },
  {
    icon: Scale,
    query: "What are my rights as a tenant?",
    response: "As a tenant, you have several important legal protections:",
    highlights: [
      {
        label: "Habitability:",
        detail: "Right to safe, livable conditions",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-green-50 to-green-100",
          borderColor: "border-green-200",
          labelColor: "text-green-900",
          detailColor: "text-green-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      },
      {
        label: "Privacy:",
        detail: "24-hour notice for landlord entry",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-emerald-50 to-emerald-100",
          borderColor: "border-emerald-200",
          labelColor: "text-emerald-900",
          detailColor: "text-emerald-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-sky-900/20 to-blue-900/20",
          borderColor: "border-sky-600/40",
          labelColor: "text-sky-300",
          detailColor: "text-sky-200"
        }
      },
      {
        label: "Security Deposit:",
        detail: "Return within 30 days after move-out",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-teal-50 to-teal-100",
          borderColor: "border-teal-200",
          labelColor: "text-teal-900",
          detailColor: "text-teal-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      }
    ]
  },
  {
    icon: Shield,
    query: "Review this employment agreement clause.",
    response: "I've analyzed the clause and found these important considerations:",
    highlights: [
      {
        label: "Non-Compete:",
        detail: "6-month restriction within 50-mile radius",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-red-50 to-red-100",
          borderColor: "border-red-200",
          labelColor: "text-red-900",
          detailColor: "text-red-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-sky-900/20 to-blue-900/20",
          borderColor: "border-sky-600/40",
          labelColor: "text-sky-300",
          detailColor: "text-sky-200"
        }
      },
      {
        label: "Intellectual Property:",
        detail: "Work-related inventions belong to company",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-pink-50 to-pink-100",
          borderColor: "border-pink-200",
          labelColor: "text-pink-900",
          detailColor: "text-pink-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-slate-800/40 to-slate-700/40",
          borderColor: "border-slate-600/50",
          labelColor: "text-slate-300",
          detailColor: "text-slate-400"
        }
      },
      {
        label: "Benefits:",
        detail: "Health insurance after 90-day probation",
        lightTheme: {
          bgColor: "bg-gradient-to-r from-rose-50 to-rose-100",
          borderColor: "border-rose-200",
          labelColor: "text-rose-900",
          detailColor: "text-rose-700"
        },
        darkTheme: {
          bgColor: "bg-gradient-to-r from-sky-900/20 to-blue-900/20",
          borderColor: "border-sky-600/40",
          labelColor: "text-sky-300",
          detailColor: "text-sky-200"
        }
      }
    ]
  }
];