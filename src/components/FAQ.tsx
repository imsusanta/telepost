import { useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

const faqs = [
  {
    question: "How does QuizGenie generate quizzes?",
    answer: "Upload your PDFs, notes, or textbooks. Our AI analyzes the content, identifies key concepts, and generates relevant multiple-choice questions aligned with your curriculum.",
  },
  {
    question: "How does the Telegram integration work?",
    answer: "Connect your Telegram channel with your bot token (we guide you through this in 2 minutes). Quizzes are automatically posted at your scheduled times, and students can answer directly in Telegram.",
  },
  {
    question: "What happens after a quiz ends?",
    answer: "QuizGenie automatically generates a PDF with all questions, correct answers, and detailed explanations. This is posted to your channel within seconds.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We're SOC 2 compliant and use AES-256 encryption. Your content is never shared or used for training. Student data is processed in compliance with GDPR.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes! Start with a 14-day free trial that includes all features. No credit card required. Generate up to 50 quizzes and connect one Telegram channel.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Frequently asked questions
          </h2>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-border"
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full flex items-center justify-between py-4 text-left"
                aria-expanded={openIndex === idx}
              >
                <span className="font-medium text-foreground pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === idx ? 'max-h-48 pb-4' : 'max-h-0'
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
