"use client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTheme } from "../contexts/ThemeContext";
import { Shield, FileText, MessageCircle, AlertTriangle, Scale, Users, Award, Lock } from "lucide-react";

export default function AboutUs() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen ${
      isLight 
        ? 'bg-gradient-to-br from-slate-50 via-white to-orange-50' 
        : 'bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900'
    }`}>
      <Header />
      
      <main className="max-w-6xl mx-auto py-20 px-4">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-8 ${
            isLight 
              ? 'bg-orange-100 text-orange-800 border border-orange-200' 
              : 'bg-orange-950/30 text-orange-300 border border-orange-700/50'
          }`}>
            <Award className="w-4 h-4 mr-2" />
            Trusted Legal AI Assistant
          </div>
          <h1 className={`text-5xl md:text-6xl font-light mb-6 tracking-tight ${
            isLight ? 'text-slate-900' : 'text-slate-100'
          }`}>
            About <span className={`font-normal ${
              isLight 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text' 
                : 'bg-gradient-to-r from-orange-400 to-amber-400 text-transparent bg-clip-text'
            }`}>advAIcate</span>
          </h1>
          <p className={`text-xl md:text-2xl font-light max-w-3xl mx-auto leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-slate-300'
          }`}>
            Empowering legal professionals and individuals with AI-driven insights, 
            secure document analysis, and comprehensive legal guidance.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { number: "10,000+", label: "Legal Documents Analyzed", icon: FileText },
            { number: "99.9%", label: "Data Security Uptime", icon: Shield },
            { number: "50+", label: "Legal Practice Areas", icon: Scale }
          ].map((stat, index) => (
            <div key={index} className={`text-center p-8 rounded-2xl border ${
              isLight 
                ? 'bg-white border-slate-200 shadow-sm' 
                : 'bg-slate-800/50 border-slate-700 backdrop-blur-sm'
            }`}>
              <stat.icon className={`w-8 h-8 mx-auto mb-4 ${
                isLight ? 'text-orange-600' : 'text-orange-400'
              }`} />
              <div className={`text-3xl font-bold mb-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {stat.number}
              </div>
              <p className={`text-sm font-medium ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Mission & Vision */}
          <div className={`p-8 rounded-2xl border ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-slate-800/50 border-slate-700 backdrop-blur-sm'
          }`}>
            <div className="flex items-center mb-6">
              <Users className={`w-6 h-6 mr-3 ${
                isLight ? 'text-orange-600' : 'text-orange-400'
              }`} />
              <h2 className={`text-2xl font-semibold ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                Our Mission
              </h2>
            </div>
            <p className={`text-base leading-relaxed mb-6 ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}>
              To democratize access to legal knowledge through cutting-edge artificial intelligence, 
              ensuring that complex legal concepts become accessible to everyone while maintaining 
              the highest standards of privacy and security.
            </p>
            <div className={`p-4 rounded-lg border-l-4 ${
              isLight 
                ? 'bg-orange-50 border-orange-400' 
                : 'bg-orange-950/20 border-orange-500'
            }`}>
              <p className={`text-sm font-medium ${
                isLight ? 'text-orange-800' : 'text-orange-300'
              }`}>
                "Bridging the gap between complex legal frameworks and practical understanding."
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className={`p-8 rounded-2xl border ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-slate-800/50 border-slate-700 backdrop-blur-sm'
          }`}>
            <div className="flex items-center mb-6">
              <MessageCircle className={`w-6 h-6 mr-3 ${
                isLight ? 'text-orange-600' : 'text-orange-400'
              }`} />
              <h2 className={`text-2xl font-semibold ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                How It Works
              </h2>
            </div>
            <div className="space-y-4">
              {[
                { step: "01", title: "Query Processing", desc: "Advanced NLP analyzes your legal questions" },
                { step: "02", title: "Document Analysis", desc: "Secure processing of contracts and legal documents" },
                { step: "03", title: "Intelligent Response", desc: "Structured, actionable legal insights delivered" }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isLight 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-orange-900/30 text-orange-400'
                  }`}>
                    {item.step}
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className={`p-8 rounded-2xl border-2 mb-12 ${
          isLight 
            ? 'bg-amber-50 border-amber-300' 
            : 'bg-amber-950/10 border-amber-700/30'
        }`}>
          <div className="flex items-start mb-4">
            <AlertTriangle className={`w-6 h-6 mr-3 mt-1 ${
              isLight ? 'text-amber-600' : 'text-amber-400'
            }`} />
            <div>
              <h2 className={`text-xl font-semibold mb-3 ${
                isLight ? 'text-amber-900' : 'text-amber-300'
              }`}>
                Professional Legal Disclaimer
              </h2>
              <div className={`text-sm leading-relaxed ${
                isLight ? 'text-amber-800' : 'text-amber-200'
              }`}>
                <p className="mb-3">
                  <strong>Important Notice:</strong> advAIcate provides general legal information and educational content only. 
                  This service does not constitute legal advice, create an attorney-client relationship, or substitute for 
                  consultation with qualified legal professionals.
                </p>
                <p>
                  Always consult with licensed attorneys in your jurisdiction for specific legal matters. 
                  Laws vary significantly by location and circumstances. Use this service as a starting point for legal research, 
                  not as definitive legal guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>     
      <Footer />
    </div>
  );
}