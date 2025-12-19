import { useState } from "react";
import { ChevronDown } from "lucide-react";

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

  return (
    <section 
      id="faq" 
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="faq-heading"
    >
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 
            id="faq-heading" 
            className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4"
          >
            Questions
          </h2>
        </div>

        {/* FAQ accordion */}
        <div className="divide-y divide-border">
          {faqs.map((faq, idx) => (
            <div key={idx}>
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between py-5 text-left focus:outline-none"
                aria-expanded={openIndex === idx}
              >
                <span className="font-medium text-foreground">{faq.question}</span>
                <ChevronDown 
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    openIndex === idx ? "rotate-180" : ""
                  }`} 
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === idx ? "max-h-32 pb-5" : "max-h-0"
                }`}
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
