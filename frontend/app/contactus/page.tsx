import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 transition-colors">
      <Header />
      <main className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">Contact Us</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
          Have questions, feedback, or need support? Reach out to our team!
        </p>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            className="w-full px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <input
            type="email"
            placeholder="Your Email"
            className="w-full px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <textarea
            placeholder="Your Message"
            rows={5}
            className="w-full px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <Button size="lg" className="bg-orange-600 hover:bg-orange-50 text-base md:text-lg px-8 md:px-10 py-3 md:py-4 font-medium">
                Watch Demo
              </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}