import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I get access to TelePost?",
    answer: "TelePost is an invitation-only platform. You'll need an invitation code to sign up. Contact our support team or your organization administrator to request an invitation code.",
  },
  {
    question: "What's included in the free tier?",
    answer: "The free tier includes access to 1 Telegram channel and 10 quizzes per month. You also get 5GB of storage for your study materials and multi-language support. Perfect for individual educators!",
  },
  {
    question: "How does TelePost generate quizzes?",
    answer: "Upload your PDFs, notes, or textbooks. Our AI analyzes the content, identifies key concepts, and generates relevant multiple-choice questions aligned with your curriculum.",
  },
  {
    question: "How does the Telegram integration work?",
    answer: "Connect your Telegram channel with your bot token (we guide you through this in 2 minutes). Quizzes are automatically posted at your scheduled times, and students can answer directly in Telegram.",
  },
  {
    question: "What happens after a quiz ends?",
    answer: "TelePost automatically generates a PDF with all questions, correct answers, and detailed explanations. This is posted to your channel within seconds.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We're SOC 2 compliant and use AES-256 encryption. Your content is never shared or used for training. Student data is processed in compliance with GDPR.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" aria-labelledby="faq-heading">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 text-sm mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">FAQ</span>
          </div>
          <h2 id="faq-heading" className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">
            Questions & Answers
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about TelePost
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-4" role="list">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`glass-card overflow-hidden transition-all duration-300 ${
                openIndex === idx ? 'shadow-glow-sm' : ''
              }`}
              role="listitem"
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
                aria-expanded={openIndex === idx}
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  openIndex === idx ? 'bg-primary/20 rotate-180' : ''
                }`}>
                  <ChevronDown className={`w-5 h-5 ${openIndex === idx ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === idx ? 'max-h-48' : 'max-h-0'
                }`}
              >
                <p className="px-6 pb-6 text-muted-foreground leading-relaxed">
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
