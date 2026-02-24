export interface ParsedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
}

// Regex character class for any digit: ASCII (0-9) + Bengali (০-৯) + Devanagari (०-९)
const DIGIT_PATTERN = '[0-9\u09E6-\u09EF\u0966-\u096F]';

// Helper to build digit+ pattern
const DIGITS = `${DIGIT_PATTERN}+`;

export function parseBulkQuestions(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Normalize line endings and trim whitespace
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // Split the text into sections starting with "1.", "১.", etc.
    // Supports ASCII, Bengali, and Devanagari digits
    const sections = normalizedText.split(new RegExp(`\\n?(?=${DIGITS}\\.\\s)`));

    for (const section of sections) {
        if (!section.trim()) continue;

        try {
            // Check which format is being used: (A)/(B)/(C)/(D) or (a)/(b)/(c)/(d) vs a)/b)/c)/d)
            const usesParenthesis = /\([A-Da-d]\)/.test(section);

            let questionText = "";
            let options: string[] = ["", "", "", ""];
            let correctIndex = -1;
            let explanation: string | undefined;

            if (usesParenthesis) {
                // Format: (A), (B), (C), (D) or (a), (b), (c), (d)
                // Extract question text (from start until first option)
                const qMatch = section.match(new RegExp(`^${DIGITS}\\.\\s*(.*?)(?=\\n\\s*\\([Aa]\\))`, 's'));
                questionText = qMatch ? qMatch[1].trim() : "";

                // Extract options
                const optAMatch = section.match(/\([Aa]\)\s*(.*?)(?=\n\s*\([Bb]\))/s);
                const optBMatch = section.match(/\([Bb]\)\s*(.*?)(?=\n\s*\([Cc]\))/s);
                const optCMatch = section.match(/\([Cc]\)\s*(.*?)(?=\n\s*\([Dd]\))/s);
                const optDMatch = section.match(/\([Dd]\)\s*(.*?)(?=\n\s*Ans\s*:)/si) ||
                    section.match(/\([Dd]\)\s*(.*?)(?=\n\s*Short Notes\s*:)/si) ||
                    section.match(/\([Dd]\)\s*(.*?)$/s);

                options = [
                    optAMatch ? optAMatch[1].trim() : "",
                    optBMatch ? optBMatch[1].trim() : "",
                    optCMatch ? optCMatch[1].trim() : "",
                    optDMatch ? optDMatch[1].split(/\n\s*Ans\s*:/i)[0].split(/\n\s*Short Notes\s*:/i)[0].trim() : ""
                ];

                // Extract answer - supports "Ans: (B)", "Ans:(b)", "Ans: B", "Ans:(b) content" formats
                const ansMatch = section.match(/Ans\s*:\s*\(?([A-Da-d])\)?/i);
                const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

                const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
                correctIndex = letterToIndex[ansLetter] ?? -1;
            } else {
                // Format: a), b), c), d) or a., b., c., d.
                const qMatch = section.match(new RegExp(`^${DIGITS}\\.\\s*(.*?)(?=\\n\\s*[aA][)\\\\.])`, 's'));
                questionText = qMatch ? qMatch[1].trim() : "";

                const optAMatch = section.match(/[aA][).]\s*(.+?)(?=\n\s*[bB][).])/s);
                const optBMatch = section.match(/[bB][).]\s*(.+?)(?=\n\s*[cC][).])/s);
                const optCMatch = section.match(/[cC][).]\s*(.+?)(?=\n\s*[dD][).])/s);
                const optDMatch = section.match(/[dD][).]\s*(.+?)(?=\n\s*Ans\s*:)/si) ||
                    section.match(/[dD][).]\s*(.+?)(?=\n\s*Short Notes\s*:)/si) ||
                    section.match(/[dD][).]\s*(.+?)$/s);

                options = [
                    optAMatch ? optAMatch[1].trim() : "",
                    optBMatch ? optBMatch[1].trim() : "",
                    optCMatch ? optCMatch[1].trim() : "",
                    optDMatch ? optDMatch[1].split(/\n\s*Ans\s*:/i)[0].split(/\n\s*Short Notes\s*:/i)[0].trim() : ""
                ];

                const ansMatch = section.match(/Ans\s*:\s*\(?([a-dA-D])\)?/i);
                const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

                const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
                correctIndex = letterToIndex[ansLetter] ?? -1;
            }

            // Extract Short Notes (optional) - supports multi-line with bullet points
            const notesMatch = section.match(/Short Notes\s*:\s*(.*)/is);
            if (notesMatch) {
                // Clean up bullet-point notes: join lines, normalize bullets
                const rawNotes = notesMatch[1].trim();
                const lines = rawNotes.split('\n').map(l => l.trim()).filter(l => l);
                explanation = lines.join('\n');
            }

            if (questionText && options.every(opt => opt !== "") && correctIndex !== -1) {
                questions.push({
                    question: questionText,
                    options,
                    correct_option_index: correctIndex,
                    explanation
                });
            }
        } catch (error) {
            console.error("Error parsing section:", section, error);
        }
    }

    return questions;
}
