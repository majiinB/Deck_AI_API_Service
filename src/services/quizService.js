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
 * @updated 2025-02-22
 */
import { getDeckById } from "../repositories/deckRepository.js";
import { sendPromptModeration } from "../services/aiService.js";

/**
 * Performs AI-based moderation on a deck's flashcards.
 *
 * @async
 * @function geminiModerationService
 * @param {string} deckId - The ID of the deck to be moderated.
 * @param {string} id - A unique identifier for the moderation request.
 * @returns {Promise<Object>} The moderation results including flagged cards and overall verdict.
 */
export const geminiQuizService = async (deckId, id) => {
    const aiResponses = [];
    let statusCode = 200;
    let data = null;
    let message = "Moderation review successful";

    try {
        const deck = await getDeckById(deckId);
        const deckTermsAndDef = deck.questions;
        const chunkedQuestions = chunkArray(deckTermsAndDef, 10);

        for (const questionGroup of chunkedQuestions) {
            let prompt = moderationPrompt(formatPrompt(questionGroup));
            let response = await sendPromptModeration(prompt);
            aiResponses.push(response);
        }

        statusCode = 200;
        data = aggregateModerationResults(aiResponses);

    } catch (error) {
        message = "Moderation review failed: " + error.message
        data = null;

        if (error.message == "Deck not found") { statusCode = 404; }
        else if (error.message == "Deck has no valid questions") { statusCode = 404; }
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
 * @param {Array} questionsChunk - The chunk of questions to format.
 * @returns {string} A formatted string for AI moderation.
 */
const formatPrompt = (questionsChunk) => {
    return questionsChunk.map(q => `Description: ${q.question}\nTerm: ${q.answer}`).join("\n\n");
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
        is_appropriate: isAppropriate,
        moderation_decision: moderationDecision,
        flagged_cards: inappropriateItems // Ensures it always returns an array
    };
};


/**
 * Generates a moderation prompt for the AI.
 *
 * @function moderationPrompt
 * @param {string} questionsChunk - A formatted chunk of questions.
 * @returns {string} A structured prompt for AI moderation.
 */
const moderationPrompt = (questionsChunk) => {
    const prompt = `You are an AI content moderator. Your task is to review the following description and terms to 
                    determine if any content is inappropriate.

                    ### Inappropriate content includes:
                    - Hate speech, discrimination, or offensive language.
                    - Sexual, violent, or disturbing content.
                    - Misinformation or misleading facts.
                    - Any content that is harmful, unethical, or violates academic integrity.

                    ### Instructions:
                    1. Review each description-term pair.
                    2. Identify any inappropriate content based on the given criteria.
                    3. Return your moderation decision accordingly and STRICTLY FOLLOW THE FORMAT.

                    ## Expected sample output format ##
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
                                description: "Inappropriate description from flashcard",
                                term: "Inappropriate term of flashcard,
                                reason: "Reason for why is it inappropriate and became flagged"
                            }
                        ] 
                    }

                    ### Content to Moderate:
                    ${questionsChunk}
        `;
    return prompt;
}
