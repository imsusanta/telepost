import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const faqs = [
  {
    question: "How do I get access to TelePost?",
    answer: "TelePost is invitation-only while we support early educators closely. Request an invitation code from support or your organization administrator. After you sign up with that code, a 7-day trial starts automatically. No credit card is required.",
  },
  {
    question: "How does the AI quiz generation work?",
    answer: "Upload your PDFs, notes, or any text content. Our AI analyzes the material and creates high-quality MCQs following Government Competitive Exam Standards. You can adjust question count, language, and topics in seconds.",
  },
  {
    question: "How does the Telegram integration work?",
    answer: "Simply connect your channel with a bot token (2-minute setup). You can then schedule quizzes to auto-post at specific times. Students answer directly in Telegram and get instant feedback. All responses are tracked for your analytics dashboard.",
  },
  {
    question: "What file formats are supported?",
    answer: "We support PDF, DOCX, TXT, and plain text. You can also paste content directly. Our AI handles various formats including scanned documents with OCR support for clear text extraction.",
  },
  {
    question: "How are question standards set?",
    answer: "All quizzes automatically follow Government Competitive Examination Standards (UPSC, SSC, State PSCs) by default, providing conceptual and exam-oriented MCQs without requiring manual difficulty selection.",
  },
  {
    question: "Is my data secure?",
    answer: "Customer data lives in Supabase Postgres with row-level security so other accounts cannot read your quizzes or channels. The app is served over HTTPS. We are not SOC 2 certified. Uploaded materials are used to generate quizzes for you; we do not sell your content. See the Data Security page for details.",
  },
  {
    question: "What's included in the free trial?",
    answer: "New accounts get a 7-day trial with the Free plan limits (including quiz generation, scheduling, and Telegram posting). An invitation code is required to sign up. No credit card is required.",
  },
  {
    question: "Are you the same as telepost.me?",
    answer: "No. TelePost at telepost.tech is an AI quiz and channel tool for Telegram educators. We are not affiliated with telepost.me, the WordPress TelePost plugin, or other products that share the name.",
  },
  {
    question: "How can I migrate my existing content?",
    answer: "You can bulk-import questions in the question bank and paste or upload documents into the quiz generator. For a large library, contact support and we will help you plan the migration.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="faq" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="faq-heading"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="faq-heading" 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            Frequently asked
            <span className="text-gradient-primary"> questions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about TelePost
          </p>
        </div>

        {/* FAQ accordion - Two columns on desktop */}
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className={`rounded-2xl border border-border/50 bg-card/30 overflow-hidden transition-all duration-500 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              } ${openIndex === idx ? "border-primary/30" : ""}`}
              style={{ transitionDelay: `${idx * 50 + 200}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="group w-full flex items-start justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                aria-expanded={openIndex === idx}
              >
                <span className="font-medium text-foreground group-hover:text-primary transition-colors pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5 transition-all duration-300 ${
                    openIndex === idx ? "rotate-180 text-primary" : ""
                  }`} 
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openIndex === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
