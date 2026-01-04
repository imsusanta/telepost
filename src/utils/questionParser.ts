export interface ParsedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
}

export function parseBulkQuestions(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Normalize line endings and trim whitespace
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // Split the text into sections starting with "1.", "2.", etc.
    const sections = normalizedText.split(/\n?(?=\d+\.)/);

    for (const section of sections) {
        if (!section.trim()) continue;

        try {
            // Check which format is being used: (A)/(B)/(C)/(D) or a)/b)/c)/d)
            const usesParenthesis = /\([A-Da-d]\)/.test(section);

            let questionText = "";
            let options: string[] = ["", "", "", ""];
            let correctIndex = -1;
            let explanation: string | undefined;

            if (usesParenthesis) {
                // Format: (A), (B), (C), (D)
                // Extract question text (from start until first option)
                const qMatch = section.match(/^\d+\.(.*?)(?=\n\s*\([Aa]\))/s);
                questionText = qMatch ? qMatch[1].trim() : "";

                // Extract options
                const optAMatch = section.match(/\([Aa]\)\s*(.*?)(?=\n\s*\([Bb]\))/s);
                const optBMatch = section.match(/\([Bb]\)\s*(.*?)(?=\n\s*\([Cc]\))/s);
                const optCMatch = section.match(/\([Cc]\)\s*(.*?)(?=\n\s*\([Dd]\))/s);
                const optDMatch = section.match(/\([Dd]\)\s*(.*?)(?=\n\s*Ans:)/si) ||
                    section.match(/\([Dd]\)\s*(.*?)$/s);

                options = [
                    optAMatch ? optAMatch[1].trim() : "",
                    optBMatch ? optBMatch[1].trim() : "",
                    optCMatch ? optCMatch[1].trim() : "",
                    optDMatch ? optDMatch[1].split(/\n\s*Ans:/i)[0].trim() : ""
                ];

                // Extract answer - supports both "Ans: (B)" and "Ans: B" formats
                const ansMatch = section.match(/Ans:\s*\(?([A-Da-d])\)?/i);
                const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

                const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
                correctIndex = letterToIndex[ansLetter] ?? -1;
            } else {
                // Format: a), b), c), d) or a., b., c., d.
                const qMatch = section.match(/^\d+\.(.*?)(?=\n\s*[aA][\)\.])/s);
                questionText = qMatch ? qMatch[1].trim() : "";

                const optAMatch = section.match(/[aA][\)\.](.*?)(?=\n\s*[bB][\)\.])/s);
                const optBMatch = section.match(/[bB][\)\.](.*?)(?=\n\s*[cC][\)\.])/s);
                const optCMatch = section.match(/[cC][\)\.](.*?)(?=\n\s*[dD][\)\.])/s);
                const optDMatch = section.match(/[dD][\)\.](.*?)(?=\n\s*Ans:)/si) ||
                    section.match(/[dD][\)\.](.*?)$/s);

                options = [
                    optAMatch ? optAMatch[1].trim() : "",
                    optBMatch ? optBMatch[1].trim() : "",
                    optCMatch ? optCMatch[1].trim() : "",
                    optDMatch ? optDMatch[1].split(/\n\s*Ans:/i)[0].trim() : ""
                ];

                const ansMatch = section.match(/Ans:\s*\(?([a-dA-D])\)?/i);
                const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

                const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
                correctIndex = letterToIndex[ansLetter] ?? -1;
            }

            // Extract Short Notes (optional)
            const notesMatch = section.match(/Short Notes:\s*(.*)/is);
            explanation = notesMatch ? notesMatch[1].trim() : undefined;

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
