import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Terms = () => {
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
                        Terms & Conditions
                    </h1>

                    <p className="text-muted-foreground mb-12">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using TelePost, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Permission is granted to temporarily use the materials on TelePost's website for personal, non-commercial transitory viewing only.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials, use the materials for any commercial purpose, or attempt to decompile or reverse engineer any software contained on TelePost's website.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">3. Disclaimer</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The materials on TelePost's website are provided on an 'as is' basis. TelePost makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">4. Limitations</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            In no event shall TelePost or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TelePost's website.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">5. Governing Law</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
                        </p>
                    </section>
                </article>
            </main>

            <Footer />
        </div>
    );
};

export default Terms;
