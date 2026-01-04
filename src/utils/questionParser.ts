export interface ParsedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
}

export function parseBulkQuestions(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Normalize line endings and trim whitespace
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // Split the text into sections starting with "1.", "2.", etc.
    // We use a positive lookahead to keep the numbering as the start of each block
    const sections = normalizedText.split(/\n?(?=\d+\.)/);

    for (const section of sections) {
        if (!section.trim()) continue;

        // Regex to match the different parts:
        // 1. Question text (from start until "a)")
        // 2. Options a, b, c, d
        // 3. Answer line starting with "Ans:"

        try {
            // Extract question text
            const qMatch = section.match(/^\d+\.(.*?)(?=\n\s*[aA][\)\.])/s);
            const questionText = qMatch ? qMatch[1].trim() : "";

            // Extract options
            const optAMatch = section.match(/[aA][\)\.](.*?)(?=\n\s*[bB][\)\.])/s);
            const optBMatch = section.match(/[bB][\)\.](.*?)(?=\n\s*[cC][\)\.])/s);
            const optCMatch = section.match(/[cC][\)\.](.*?)(?=\n\s*[dD][\)\.])/s);
            const optDMatch = section.match(/[dD][\)\.](.*?)(?=\n\s*Ans:)/si);

            // If we don't find "Ans:", try matching until the end for option D
            const optDMatchFinal = optDMatch || section.match(/[dD][\)\.](.*?)$/s);

            const options = [
                optAMatch ? optAMatch[1].trim() : "",
                optBMatch ? optBMatch[1].trim() : "",
                optCMatch ? optCMatch[1].trim() : "",
                optDMatchFinal ? optDMatchFinal[1].split(/\n\s*Ans:/i)[0].trim() : ""
            ];

            // Extract raw answer
            const ansMatch = section.match(/Ans:\s*([a-dA-D])/i);
            const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

            // Map letter to index
            const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
            const correctIndex = letterToIndex[ansLetter] ?? -1;

            if (questionText && options.every(opt => opt !== "") && correctIndex !== -1) {
                questions.push({
                    question: questionText,
                    options,
                    correct_option_index: correctIndex
                });
            }
        } catch (error) {
            console.error("Error parsing section:", section, error);
        }
    }

    return questions;
}
