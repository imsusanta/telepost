import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Privacy = () => {
    const navigate = useNavigate();

    const handleGetStarted = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            navigate("/dashboard");
        } else {
            navigate("/auth");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation onGetStarted={handleGetStarted} />

            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <article className="prose prose-zinc dark:prose-invert max-w-none">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-8 text-gradient-primary">
                        Privacy Policy
                    </h1>

                    <p className="text-muted-foreground mb-12">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Welcome to TelePost. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We collect information that you provide directly to us when you:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Register for an account</li>
                            <li>Use our AI generation tools</li>
                            <li>Connect your Telegram channels</li>
                            <li>Contact our support team</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            TelePost uses the collected data for various purposes:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>To provide and maintain our Service</li>
                            <li>To notify you about changes to our Service</li>
                            <li>To provide customer support</li>
                            <li>To gather analysis or valuable information so that we can improve our Service</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at support@telepost.tech.
                        </p>
                    </section>
                </article>
            </main>

            <Footer />
        </div>
    );
};

export default Privacy;
