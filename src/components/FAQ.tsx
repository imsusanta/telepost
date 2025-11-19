import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does QuizGenie generate quizzes from my content?",
    answer: "QuizGenie uses advanced AI models to analyze your uploaded PDFs, notes, or textbooks. It identifies key concepts, facts, and learning objectives, then generates relevant multiple-choice, true/false, or open-ended questions. The AI ensures questions are pedagogically sound and aligned with your curriculum.",
  },
  {
    question: "Can I customize the difficulty level of quizzes?",
    answer: "Absolutely! You can set difficulty levels from Easy to Advanced for each quiz. You can also mix difficulty levels within a single quiz to create progressive challenges. The AI adapts question complexity based on your selected parameters.",
  },
  {
    question: "How does the Telegram integration work?",
    answer: "Simply connect your Telegram channel by providing your bot token (we guide you through this in 2 minutes). Once connected, quizzes are automatically posted at your scheduled times. Students can answer directly in Telegram, and results are tracked in your dashboard.",
  },
  {
    question: "What happens after a quiz ends?",
    answer: "When a quiz timer expires, QuizGenie automatically generates a beautiful PDF with all questions, correct answers, and detailed explanations. This PDF is posted to your channel within seconds, giving students immediate feedback and learning resources.",
  },
  {
    question: "Can I manage multiple Telegram channels?",
    answer: "Yes! Our Pro and Enterprise plans support unlimited channels. You can create different content schedules, customize branding, and view separate analytics for each channel. Perfect for institutes with multiple subjects or branches.",
  },
  {
    question: "Is my content and student data secure?",
    answer: "Security is our top priority. We're SOC 2 compliant and use bank-level AES-256 encryption. Your uploaded content is never shared or used for training. Student data is processed in compliance with GDPR and Indian data protection laws.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes! Start with our 14-day free trial that includes all Pro features. No credit card required. You can generate up to 50 quizzes and connect one Telegram channel during the trial period.",
  },
  {
    question: "Can I import questions from my existing question bank?",
    answer: "Yes, you can import questions via CSV, Excel, or our API. We also support direct imports from popular formats used by coaching platforms. Our team can assist with bulk migrations for enterprise customers.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-t from-accent/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm clay-card mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">FAQ</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Frequently Asked
            <span className="text-gradient bg-gradient-to-r from-primary via-accent to-secondary"> Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about QuizGenie
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="clay-card bg-card/50 backdrop-blur-sm overflow-hidden animate-scale-in"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-card/30 transition-colors"
                aria-expanded={openIndex === idx}
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === idx ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
          >
            Contact our support team
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </a>
        </div>
      </div>
    </section>
  );
};
