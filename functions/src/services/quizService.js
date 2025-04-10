/**
 * Deck API - Quiz Service
 *
 * @file quizService.js
 * @description Provides AI-based quiz services for flashcards.
 * 
 * This module interacts with AI models (Gemini) to generate multiple choice quizzes based on the given flashcards 
 * 
 * @module moderationService
 * 
 * @requires ../repositories/deckRepository.js - Handles deck data retrieval.
 * @requires ../services/aiService.js - Handles AI quiz generation  inline data requests.
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-20
 * @updated 2025-03-20
 */
import { getDeckById, getDeckAndCheckField, updateDeck, getNewFlashcards } from "../repositories/deckRepository.js";
import { sendPromptInline } from "./aiService.js";
import { quizSchema } from "../schema/quizSchema.js";
import { createQuizForDeck, createQuestionAndAnswer, getQuizByDeckIDAndQuizType } from "../repositories/quizRepository.js";
import { timeStamp } from "../config/firebaseAdminConfig.js";

/**
 * Generates a quiz for a given deck by checking existing quizzes and using AI to generate new questions if needed.
 *
 * @async
 * @function geminiQuizService
 * @param {string} deckId - The unique identifier of the deck.
 * @param {string} id - The user ID of the request owner.
 * @returns {Promise<Object>} - Returns an object containing the quiz ID or a message indicating quiz creation status.
 * @throws {Error} - Throws an error if the deck is invalid, AI response fails, or Firestore operations encounter an issue.
 */
export const geminiQuizService = async (deckId, id) => {
    const aiResponses = [];
    const batchSize = 20;
    let quizId = "";
    let quizUpdateDate = "";
    let tokenCount = 0;
    let statusCode = 400;
    let data = null;
    let message = `Quiz creation for deck with id:${deckId} is unsuccessful`;

    try {
        // Validate input
        if (!deckId || typeof deckId !== 'string') throw new Error("INVALID_DECK_ID");
        if (!id || typeof id !== 'string') throw new Error("INVALID_USER_ID"); // TODO: CHECK IF THE REQUEST CAME FROM A VALID USER

        // Check if the deck was already made to a quiz and when was the last time the deck was updated
        const deckInfo = await getDeckAndCheckField(deckId, "made_to_quiz_at"); 
        
        // Retrieves the quiz related to the provided deck ID
        const quizzes = await getQuizByDeckIDAndQuizType(deckId, 'multiple-choice');

        // If quizzes has an item assign the id of the first element
        if (quizzes?.length > 0) {
            quizId = quizzes[0].id;
            quizUpdateDate = quizzes[0].updated_at;
        }

        /** Check if the following conditions are true
         * - The deck should exist
         * - The deck should not have a 'made_to_quiz_at' field
         * - There should be no quiz document in the quiz collection related to the deck ID
         * */ 
        if(deckInfo?.exists && !deckInfo.field_exists && (!quizzes || quizzes.length === 0)){
            /**
             * This block is for when the given deck doesn't have any quiz in the 'quiz' collection
             * The deck still has no quiz made for it
             */
            
            // Retrieve and process deck data to be passed to the AI
            const deck = await getDeckById(deckId);
            const deckTermsAndDef = deck.flashcards;
            console.log(JSON.stringify(deckTermsAndDef, true, 2));
            
            // Retrieve and process results that will be stored in the database ( 'quiz' collection )
            quizId = await createQuizForDeck({
                associated_deck_id: deckId,
                created_at: timeStamp,
                is_deleted: false,
                quiz_type: "multiple-choice",
                updated_at:  timeStamp,
            });

            if(Array.isArray(deckTermsAndDef) && deckTermsAndDef.length > 0){
                for (let i = 0; i < deckTermsAndDef?.length; i += batchSize) {
                    const batch = deckTermsAndDef?.slice(i, i + batchSize);
                    const prompt = quizPrompt(batch.length);
    
                    let result;
                    try {
                        result = await sendPromptInline(quizSchema, prompt, formatData(batch));
                        if (!result.quiz_data || !Array.isArray(result.quiz_data.quiz)) {
                            throw new Error("Invalid AI response: quiz_data is missing or not an array");
                        }
                    } catch (error) {
                        throw new Error("AI_GENERATION_FAILED");
                    }
                    
                    const questionAndAnswer = result.quiz_data.quiz;
                    await createQuestionAndAnswer(quizId, questionAndAnswer);
                }
                // Update Deck information ( add the following fields to the deck: made_to_quiz_at)
                await updateDeck(deckId, {made_to_quiz_at: timeStamp});

                // Response data
                statusCode = 200;
                data = {quizId: quizId}
                message = `Quiz creation for deck with id:${deckId} is successful`;
            }
            
        }else if(quizzes && quizzes.length >= 1){
            // The deck already has a quiz, check for new flashcards

            // Retrieve new flashcards if there is any
            const newFlashcards = await getNewFlashcards(deckId, quizUpdateDate);
            const numOfNewFlashCards = newFlashcards.length;

            if(numOfNewFlashCards > 0){
                for (let i = 0; i < newFlashcards.length; i += batchSize) {
                    const batch = newFlashcards.slice(i, i + batchSize);
                    const prompt = quizPrompt(batch.length);

                    let result;
                    try {
                        result = await sendPromptInline(quizSchema, prompt, formatData(batch));
                        if (!result.quiz_data || !Array.isArray(result.quiz_data.quiz)) {
                            throw new Error("Invalid AI response: quiz_data is missing or not an array");
                        }
                    } catch (error) {
                        throw new Error("AI_GENERATION_FAILED");
                    }

                    const questionAndAnswer = result.quiz_data.quiz;
                    await createQuestionAndAnswer(quizId, questionAndAnswer);
                }

                await updateDeck(deckId, {made_to_quiz_at: timeStamp});

                statusCode = 200;
                data = {no_of_new_flashcards: numOfNewFlashCards}
                message = `Quiz creation for new flashcards in deck ${deckId} is successful`
            } else{
                statusCode = 200;
                data = {quiz_id: quizId};
                message = `There is already a quiz made for this deck in the 'quiz' collection`
            }
        }
    } catch (error) {
        message = "Quiz creation failed: " + error.message
        data = null;

        switch (error.message) {
            case "INVALID_DECK_ID":
                statusCode = 400;
                break;
            case "INVALID_USER_ID":
                statusCode = 400;
                break;
            case "DECK_NOT_FOUND":
                statusCode = 404;
                break;
            case "MISSING_MADE_TO_QUIZ_AT_FIELD":
                statusCode = 404;
                break;
            case "NO_VALID_QUESTIONS":
                statusCode = 400;
                break;
            case "AI_GENERATION_FAILED":
                statusCode = 502; // Bad Gateway (AI Failure)
                break;
            default:
                statusCode = 500;
                message = "A server-side error has occurred";
                console.error(`Server-side error: ${error.message}`);
                break;
        }
    }
    return {
        status: statusCode,
        request_owner_id: id,
        message: message,
        data: data
    }
}

/**
 * Formats a chunk of questions into a prompt-friendly format.
 *
 * @function formatData
 * @param {Array} questionsChunk - The chunk of questions to format.
 * @returns {string} A formatted string for AI moderation.
 */
const formatData = (questionsChunk) => {
    return questionsChunk.map(q => `ID: ${q.id}\nDescription: ${q.question}\nTerm: ${q.answer}`).join("\n\n");
};

/**
 * Generates a moderation prompt for the AI.
 *
 * @function moderationPrompt
 * @param {string} questionsChunk - A formatted chunk of questions.
 * @returns {string} A structured prompt for AI moderation.
 */
const quizPrompt = (number) => {
    const prompt = `You are an expert quiz generator. Based on the provided flashcards, create a well-balanced multiple-choice quiz. 
    Each question should assess understanding of the terms and definitions given. Follow these strict requirements:

    - Number of Questions: Generate exactly ${number} questions. Do not return more or fewer.
    - Question Quality: Each question must be clear, relevant, and derived from the flashcard content.
    - Rephrasing Requirement: Avoid copying the exact wording from the flashcard. Instead, rephrase to encourage critical thinking.
    - Answer Choices: Each question must have four answer choices, with only one correct answer.
    - Plausible Distractors: The incorrect choices (distractors) should be plausible but incorrect.c
    - Question Types: Ensure a mix of:
        - Direct recall questions
        - Application-based questions
        - Conceptual questions
    - Error Handling: If the flashcard set is too small to generate the required number of questions, 
        return the following error message instead of an incomplete quiz:
        { "quiz": [], "errorMessage": "Insufficient flashcards to generate ${number} questions." }

    ### Instructions for Generating the Quiz:
    1. Analyze the provided description-term pairs
    2. Generate exactly ${number} well-structured questions.
    3. Strictly follow the expected output format below.

    ## Expected sample output format ##
    Example 1:
    {
        "quiz": [
            {
                "question": "Which process allows plants to convert sunlight into energy?",
                "related_flashcard_id": "HTALJDF134",
                "choices": [
                    { "text": "Photosynthesis", "is_correct": true },
                    { "text": "Respiration", "is_correct": false },
                    { "text": "Fermentation", "is_correct": false },
                    { "text": "Transpiration", "is_correct": false }
                ]
            },
            {
                "question": "What is the primary result of mitosis?",
                "related_flashcard_id": "LKNDALFK923",
                "choices": [
                    { "text": "Two identical daughter cells", "is_correct": true },
                    { "text": "Four genetically unique cells", "is_correct": false },
                    { "text": "A single large cell", "is_correct": false },
                    { "text": "Cell death", "is_correct": false }
                ]
            }
        ],
        "errorMessage": null
    }`;
    return prompt;
}

