import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const faqs = [
  {
    question: "How do I get access to TelePost?",
    answer: "TelePost is currently invitation-only to ensure quality support for our users. Contact our support team or your organization administrator to request an invitation code. Once approved, you can start your free trial immediately.",
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
    answer: "Yes, security is our top priority. We use AES-256 encryption for all data at rest and in transit. We're SOC 2 compliant and GDPR ready. Your content is never shared or used for training AI models without explicit consent.",
  },
  {
    question: "What's included in the free trial?",
    answer: "The free trial includes full access to all features for 14 days. You can create unlimited quizzes, connect one Telegram channel, and access analytics. No credit card required to start.",
  },
  {
    question: "How can I migrate my existing content?",
    answer: "We offer bulk import tools and can help you migrate existing question banks. Contact our support team for assisted migration of large content libraries. We also integrate with Google Drive for seamless imports.",
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
