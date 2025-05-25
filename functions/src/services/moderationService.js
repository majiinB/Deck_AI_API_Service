/**
 * Deck API - Moderation Service
 *
 * @file moderationService.js
 * @description Provides AI-based moderation services for flashcards.
 * 
 * This module interacts with AI models (Gemini) to moderate flashcards 
 * by checking for inappropriate content.
 * 
 * @module moderationService
 * 
 * @requires ../repositories/deckRepository.js - Handles deck data retrieval.
 * @requires ../services/aiService.js - Handles AI moderation requests.
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-20
 * @updated 2025-03-19
 */
import { getDeckById } from "../repositories/deckRepository.js";
import { sendPromptModeration, countToken, sendPromptInline} from "./aiService.js";
import { moderatedFlashcardsSchema } from '../schema/flashcardModerationSchema.js';
import path from 'path';
import { writeFile } from "fs/promises";
import { createPublishRequest, getPublishRequestByDeckId } from "../repositories/publishRequestRepository.js";

/**
 * Performs AI-based moderation on a deck's flashcards.
 *
 * @async
 * @function geminiModerationService
 * @param {string} deckId - The ID of the deck to be moderated.
 * @param {string} id - A unique identifier for the moderation request.
 * @returns {Promise<Object>} The moderation results including flagged cards and overall verdict.
 */
export const geminiModerationService = async (deckId, id) => {
    const aiResponses = [];
    let tokenCount = 0;
    let statusCode = 200;
    let data = null;
    let message = "Moderation review successful";

    try {
        // Prepare file path
        const tmpDir = '/tmp';
        const destFilename = `moderateDeck-${id}.txt`;
        const tmpFilePath = path.join(tmpDir, destFilename);
        
        // Retrieve deck content
        const deck = await getDeckById(deckId);
        const deckTermsAndDef = deck.flashcards;
        // Format deck content to be written to file
        const deckToString = formatPrompt(deckTermsAndDef);
        await writeFile(tmpFilePath, deckToString);
        
        const prompt = moderationPrompt();
        const result = await sendPromptInline(moderatedFlashcardsSchema, prompt, tmpFilePath, "txt");
        const overallVerdict = result.quiz_data.overall_verdict;

        await createPublishRequest(id, deckId, overallVerdict);
        
        console.log(await getPublishRequestByDeckId(deckId));
        
        statusCode = 200;
        data = result;
    } catch (error) {
        console.log(error);
        
        message = "Moderation review failed: " + error.message
        data = null;

        if (error.message == "DECK_NOT_FOUND") { statusCode = 404; }
        else if (error.message == "NO_VALID_FLASHCARDS") { statusCode = 404; }
        else { statusCode = 500; }
    }

    return {
        status: statusCode,
        request_owner_id: id,
        message: message,
        data: data
    }

}

/**
 * Splits an array into smaller chunks.
 *
 * @function chunkArray
 * @param {Array} array - The array to be split.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array[]} An array of chunked arrays.
 */
const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};

/**
 * Formats a chunk of questions into a prompt-friendly format.
 *
 * @function formatPrompt
 * @param {Array} flashcardChunk - The chunk of questions to format.
 * @returns {string} A formatted string for AI moderation.
 */
const formatPrompt = (flashcardChunk) => {
    return flashcardChunk.map(f => `Definition: ${f.definition}\nTerm: ${f.term}`).join("\n\n");
};


/**
 * Aggregates moderation results from AI responses.
 *
 * @function aggregateModerationResults
 * @param {Array} aiResponses - The AI responses containing moderation decisions.
 * @returns {Object} Aggregated moderation results.
 */
const aggregateModerationResults = (aiResponses) => {
    let isAppropriate = true;
    let inappropriateItems = [];
    let moderationDecision = 'Content is appropriate';

    for (const response of aiResponses) {
        if (!response.data.overall_verdict.is_appropriate) {
            isAppropriate = false;
            moderationDecision = response.data.overall_verdict.moderation_decision;
            // Ensure flagged_cards exists and is an array before concatenation
            if (Array.isArray(response.data.overall_verdict.flagged_cards) && response.data.overall_verdict.flagged_cards.length > 0) {
                inappropriateItems = inappropriateItems.concat(response.data.overall_verdict.flagged_cards);
            }
        }
    }

    return {
        overall_verdict:{
            is_appropriate: isAppropriate,
            moderation_decision: moderationDecision,
            flagged_cards: inappropriateItems // Ensures it always returns an array
        }
    };
};


/**
 * Generates a moderation prompt for the AI.
 *
 * @function moderationPrompt
 * @param {string} questionsChunk - A formatted chunk of questions.
 * @returns {string} A structured prompt for AI moderation.
 */
const moderationPrompt = (questionsChunk = null) => {
    let prompt = "";
    return prompt = `You are an AI content moderator with expertise in identifying various forms of inappropriate content, including misinformation and factual inaccuracies. Using the provided file containing definition-term pairs, your task is to meticulously review each pair to determine if any content violates the following criteria:

        ### Criteria for Inappropriate Content:
        - Hate speech, discrimination, profanity, or offensive language.
        - Sexual, violent, or disturbing content.
        - Misinformation: False or misleading information presented as fact, especially with the intent to deceive.
        - Incorrect information or facts: Statements that contradict established knowledge or evidence.
        - Any content that is harmful, unethical, or violates academic integrity.

        ### Instructions:
        1. **Thoroughly review each definition-term pair.** For each pair, consider not only the language used but also the accuracy and potential for the definition to be misleading.
        2. **Verify the factual accuracy of the definitions.** Compare the provided definitions against your internal knowledge base and understanding of the subject matter. Identify any definitions that are factually incorrect, outdated, or present a distorted view of the concept.
        3. **Identify any misinformation or misleading facts.** This includes definitions that, while not entirely false, could lead to incorrect conclusions or understandings. Consider the context and potential impact of the information.
        4. **Flag any content that meets the criteria for inappropriate content.**
        5. **Return your moderation decision accordingly and STRICTLY FOLLOW THE FORMAT.**
        6. **For reviewing misinformation** consider cross-reference with common knowledge and flag discrepancies.

        ## Expected Sample Output Format ##
        Example 1:
        overall_verdict{
            is_appropriate: true,
            moderation_decision: "content is appropriate",
            flagged_cards: [] //empty because the overall decision is appropriate
        }

        Example 2:
        overall_verdict{
            is_appropriate: false,
            moderation_decision: "content is inappropriate",
            flagged_cards: [
                {
                    definition: "Inappropriate definition from flashcard",
                    term: "Inappropriate term of flashcard",
                    reason: "Reason for why it is inappropriate (e.g., contains hate speech)."
                }
            ]
        }

        Example 3:
        overall_verdict{
            is_appropriate: false,
            moderation_decision: "content is inappropriate",
            flagged_cards: [
                {
                    definition: "Describes an algorithm whose execution time increases exponentially with the input size; typically associated with highly efficient approaches.",
                    term: "Exponential Time",
                    reason: "The definition incorrectly describes exponential time algorithms as highly efficient. They are typically inefficient for large inputs."
                },
                {
                    definition: "The chemical formula for water is H3O.",
                    term: "Water Formula",
                    reason: "The chemical formula for water is incorrectly stated. The correct formula is H2O."
                },
                {
                    definition: "Describes the amount of time an algorithm takes to run as a function of the input size.",
                    term: "ASS FUCK",
                    reason: "The term contains profanity and offensive language."
                }
            ]
        }
    `;
}
