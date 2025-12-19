import { Quote, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const testimonials = [
  {
    name: "Dr. Priya Sharma",
    role: "Director, Elite IIT Academy",
    avatar: "PS",
    content: "TelePost transformed our Telegram channel from 5K to 50K subscribers in just 3 months. The AI-generated quizzes are incredibly accurate and engaging. Our students love it!",
    rating: 5,
    metric: "10x subscriber growth",
    gradient: "from-primary to-accent",
  },
  {
    name: "Rahul Verma",
    role: "Founder, UPSC Warriors",
    avatar: "RV",
    content: "I used to spend 4 hours daily creating current affairs quizzes. Now it takes 10 minutes. The auto-generated explanation PDFs have become our most requested feature.",
    rating: 5,
    metric: "95% time saved",
    gradient: "from-accent to-secondary",
  },
  {
    name: "Anita Desai",
    role: "CEO, LearnSmart Coaching",
    avatar: "AD",
    content: "The scheduling feature is a game-changer. We run 15 Telegram channels across different subjects, all automated. TelePost pays for itself within the first week.",
    rating: 5,
    metric: "15 channels automated",
    gradient: "from-secondary to-success",
  },
  {
    name: "Mohammed Khan",
    role: "Head, Khan's Banking Institute",
    avatar: "MK",
    content: "Our student engagement rate jumped from 23% to 89%. The quiz format keeps students coming back daily. Best investment we've made in our digital strategy.",
    rating: 5,
    metric: "89% engagement rate",
    gradient: "from-success to-primary",
  },
  {
    name: "Sneha Patel",
    role: "Content Lead, NEET Prep Pro",
    avatar: "SP",
    content: "The multi-language support is phenomenal. We create quizzes in Hindi and English simultaneously. Our reach has expanded to Tier 2 and Tier 3 cities.",
    rating: 5,
    metric: "3x regional reach",
    gradient: "from-primary to-secondary",
  },
  {
    name: "Vikram Singh",
    role: "Director, Singh's Math Classes",
    avatar: "VS",
    content: "Parents love the detailed analytics reports. They can see exactly how their children are performing. This transparency has increased our enrollment by 40%.",
    rating: 5,
    metric: "40% enrollment boost",
    gradient: "from-accent to-success",
  },
];

export const Testimonials = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="testimonials" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-border/50"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-l from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-gradient-to-r from-accent/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>Loved by 500+ educators</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            What our customers
            <span className="text-gradient-primary"> are saying</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Join the community of educators transforming their teaching with TelePost
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className={`group relative p-8 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:shadow-glow-sm ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              {/* Quote icon */}
              <Quote className="w-10 h-10 text-primary/20 mb-6" />

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              {/* Metric badge */}
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r ${testimonial.gradient} text-white text-xs font-semibold mb-6`}>
                {testimonial.metric}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4 pt-6 border-t border-border/50">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
