import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const faqs = [
  {
    question: "How do I get access?",
    answer: "TelePost is invitation-only. Contact our support team or your organization administrator to request an invitation code.",
  },
  {
    question: "How does quiz generation work?",
    answer: "Upload your PDFs or notes. Our AI analyzes the content and creates relevant multiple-choice questions aligned with your curriculum.",
  },
  {
    question: "How does Telegram integration work?",
    answer: "Connect your channel with a bot token (2-minute setup). Quizzes auto-post at scheduled times, and students answer directly in Telegram.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use AES-256 encryption and are SOC 2 compliant. Your content is never shared or used for training.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="faq" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="faq-heading"
    >
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-12 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="faq-heading" 
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            Questions
          </h2>
        </div>

        {/* FAQ accordion */}
        <div className="divide-y divide-border">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className={`transition-all duration-500 ${
                isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
              style={{ transitionDelay: `${idx * 100 + 200}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="group w-full flex items-center justify-between py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-colors"
                aria-expanded={openIndex === idx}
              >
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-muted-foreground transition-all duration-300 ${
                    openIndex === idx ? "rotate-180 text-primary" : ""
                  }`} 
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openIndex === idx ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
