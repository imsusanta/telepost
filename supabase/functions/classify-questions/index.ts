import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway configuration (same as generate-quiz)
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

const PREDEFINED_SUBJECTS = [
    "Science",
    "Mathematics",
    "Social Studies",
    "English",
    "Computer Science"
];

interface ClassificationRequest {
    question: string;
    options: string[];
    explanation?: string;
}

interface ClassificationResult {
    subject: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    confidence: number;
    suggestedTags?: string[];
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { questions, mode = 'single' } = await req.json();

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return new Response(
                JSON.stringify({ error: "Questions array is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Limit batch size
        const maxQuestions = mode === 'bulk' ? 10 : 1;
        const questionsToProcess = questions.slice(0, maxQuestions);

        // Build the prompt for classification
        const questionsText = questionsToProcess.map((q: any, idx: number) => {
            const safeOptions = Array.isArray(q.options) ? q.options : [];
            const optionsText = safeOptions.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n');
            return `Question ${idx + 1}:
${q.question}
Options:
${optionsText}
${q.explanation ? `Explanation: ${q.explanation}` : ''}`;
        }).join('\n\n---\n\n');

        const systemPrompt = `You are a high-accuracy educational content classifier.
Task: Classify questions into Subject and Topic.

SUBJECT LIST: ${PREDEFINED_SUBJECTS.join(', ')}.

CRITICAL RULES:
1. Subject MUST be exactly one from the list: Science, Mathematics, Social Studies, English, Computer Science.
2. For "Science", topics include: Blood, Digestion, Respiration, Photosynthesis, Force and Motion, etc.
3. For "Mathematics", topics include: Algebra, Geometry, Arithmetic, Statistics, etc.
4. Be specific and concise with topics.
5. Topic/Chapter must be a specific English name (even for Bengali questions).
6. RETURN ONLY A JSON ARRAY. NO PREAMBLE.

Response Format:
[
  {"question": "question text", "subject": "Subject Name", "topic": "Topic Name", "difficulty": "easy|medium|hard", "confidence": 0-100}
]`;

        const userPrompt = `Classify these ${questionsToProcess.length} question(s):
${questionsText}

Format: [{"subject": "...", "topic": "...", "difficulty": "easy|medium|hard", "confidence": 0-100}]`;

        console.log(`Classifying ${questionsToProcess.length} questions...`);

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
            throw new Error("LOVABLE_API_KEY is not configured");
        }

        // Call AI Gateway
        const aiResponse = await fetch(LOVABLE_AI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1, // Lower temperature for more stable JSON
                max_tokens: 2000,
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI Gateway error:", errorText);
            throw new Error(`AI Gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
            console.error("AI response missing content. Data:", JSON.stringify(aiData));
            throw new Error("No content in AI response");
        }

        console.log("RAW AI CONTENT START");
        console.log(content);
        console.log("RAW AI CONTENT END");

        // CLEANING STRATEGY (matching generate-quiz)
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith("```")) {
            // Remove opening fence (```json or ```)
            cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, "");
            // Remove closing fence
            cleanedContent = cleanedContent.replace(/\n?```\s*$/, "");
        }
        cleanedContent = cleanedContent.trim();

        // Parse the JSON response
        let results: ClassificationResult[] = [];
        try {
            results = JSON.parse(cleanedContent);

            if (!Array.isArray(results)) {
                if (typeof results === 'object' && results !== null) {
                    results = [results as any];
                } else {
                    throw new Error("Result is not an array or object");
                }
            }

            // Validate and normalize results with case-insensitivity
            results = results.map((r: any) => {
                const subjectName = r.subject || r.Subject || r.SUBJECT || 'General Knowledge';
                const topic = r.topic || r.Topic || r.TOPIC || 'General';
                const difficulty = r.difficulty || r.Difficulty || r.DIFFICULTY || 'medium';
                const confidence = r.confidence ?? r.Confidence ?? r.CONFIDENCE ?? 85;

                // Improved subject mapping
                const matchedSubject = PREDEFINED_SUBJECTS.find(s => s.toLowerCase() === subjectName.toLowerCase());

                return {
                    subject: matchedSubject || subjectName,
                    topic: topic,
                    difficulty: ['easy', 'medium', 'hard'].includes(difficulty.toLowerCase().trim()) ? difficulty.toLowerCase().trim() : 'medium',
                    confidence: typeof confidence === 'number' ? Math.min(100, Math.max(0, confidence)) : 85,
                    suggestedTags: Array.isArray(r.suggestedTags || r.tags) ? (r.suggestedTags || r.tags) : []
                } as ClassificationResult;
            });

        } catch (err: any) {
            console.error("DIAGNOSTIC - JSON Parse Failed");
            console.error("Error:", err.message);
            console.error("Cleaned Content Length:", cleanedContent.length);
            // Fallback handled below
        }

        // Ensure we have the right number of results
        while (results.length < questionsToProcess.length) {
            results.push({
                subject: 'General Knowledge',
                topic: 'General',
                difficulty: 'medium',
                confidence: 0, // 0 means system failure
                suggestedTags: []
            });
        }

        console.log(`Successfully processed ${results.length} results. Status: ${results.filter(r => r.confidence > 0).length} success, ${results.filter(r => r.confidence === 0).length} failure.`);

        return new Response(
            JSON.stringify({
                success: true,
                results: results.slice(0, questionsToProcess.length),
                processed: questionsToProcess.length,
                debug: {
                    contentLength: content.length,
                    hasResults: results.length > 0
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Classification error:", error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Classification failed",
                success: false
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
