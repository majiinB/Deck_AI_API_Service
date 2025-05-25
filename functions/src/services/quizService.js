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
import { createQuizForDeck, createQuestionAndAnswer, getQuizByDeckIDAndQuizType, getQuizByID } from "../repositories/quizRepository.js";
import { timeStamp } from "../config/firebaseAdminConfig.js";
import { logger } from "firebase-functions";
import path from 'path';
import { writeFile } from "fs/promises";
import { fischerYatesShuffle } from "../utils/utils.js";

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
export const geminiQuizService = async (deckId, id, numOfQuiz) => {
    const aiResponses = [];
    const batchSize = 20;
    let quizId = "";
    let quizUpdateDate = "";
    let tokenCount = 0;
    let statusCode = 400;
    let data = null;
    let message = `Quiz creation for deck with id:${deckId} is unsuccessful`;

    logger.info("Request for quiz creation is called by:", id);
    try {
        // Validate input
        if (!deckId || typeof deckId !== 'string'){
            logger.info(
                "Request for quiz creation has failed due to ",
                "ERROR: INVALID_DECK_ID",
                "Deck ID provided? ", !deckId,
                "Deck ID is a type of string?", 
                typeof deckId !== 'string',
            );
            throw new Error("INVALID_DECK_ID");
        } 
        
        if (!id || typeof id !== 'string'){
            logger.info(
                "Request for quiz creation has failed due to ",
                "ERROR: INVALID_USER_ID",
                "User ID provided? ", !id,
                "User ID is a type of string?", 
                typeof id !== 'string',
            );
            throw new Error("INVALID_USER_ID");
        } 

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

            if(Array.isArray(deckTermsAndDef) && deckTermsAndDef.length > 0){
                // Retrieve and process results that will be stored in the database ( 'quiz' collection )
                const quizzesToString = `${JSON.stringify(deckTermsAndDef, null, 2)}` ;
                const tmpDir = '/tmp';
                const destFilename = `downloadQuiz-${id}.txt`;
                const tmpFilePath = path.join(tmpDir, destFilename);
                await writeFile(tmpFilePath, quizzesToString);
                const prompt = quizPrompt(deckTermsAndDef.length);

                let result;
                try {
                    result = await sendPromptInline(quizSchema, prompt, tmpFilePath, "txt");
                    console.log(result);

                } catch (error) {
                    console.log(error);
                    throw new Error("AI_GENERATION_FAILED");
                }

                if (!result.quiz_data || !Array.isArray(result.quiz_data.quiz)) {
                    throw new Error("Invalid AI response: quiz_data is missing or not an array");
                }

                const questionAndAnswer = result.quiz_data.quiz;

                quizId = await createQuizForDeck({
                    associated_deck_id: deckId,
                    created_at: timeStamp,
                    is_deleted: false,
                    quiz_type: "multiple-choice",
                    updated_at:  timeStamp,
                });
                
                await createQuestionAndAnswer(quizId, questionAndAnswer);

                // Update Deck information ( add the following fields to the deck: made_to_quiz_at)
                await updateDeck(deckId, {made_to_quiz_at: timeStamp});

                const quizObject = await getQuizByID(quizId, "multiple-choice");
                const quizzes =  quizObject.questions;
                
                const shuffledQuizzes = fischerYatesShuffle(quizzes);

                let numToReturn = numOfQuiz;

                if (numToReturn === null || numToReturn === undefined) {
                    // 4. Edge case: No numOfCards provided
                    numToReturn = Math.ceil(shuffledQuizzes.length * 0.5); // Default to 50%
                }

                if (numToReturn > shuffledQuizzes.length) {
                    const error = new Error("Requested number of flashcards exceeds available cards.");
                    error.name = "EXCEEDS_AVAILABLE_CARDS";
                    throw error;
                }

                const selectedQuizzes = shuffledQuizzes.slice(0, numToReturn);

                quizObject.questions = selectedQuizzes;
                
                // Response data
                statusCode = 200;
                data = {quizContent: quizObject}
                message = `Quiz creation for deck with id:${deckId} is successful`;
            }
            
        }else if(quizzes && quizzes.length >= 1){
            // The deck already has a quiz, check for new flashcards

            // Retrieve new flashcards if there is any
            const newFlashcards = await getNewFlashcards(deckId, quizUpdateDate);
            const numOfNewFlashCards = newFlashcards.length;

            if(numOfNewFlashCards > 0){

                const quizzesToString = `${JSON.stringify(newFlashcards, null, 2)}` ;
                const tmpDir = '/tmp';
                const destFilename = `downloadQuiz-${id}.txt`;
                const tmpFilePath = path.join(tmpDir, destFilename);
                await writeFile(tmpFilePath, quizzesToString);

                const prompt = quizPrompt(newFlashcards.length);
                let result;
                try {
                    result = await sendPromptInline(quizSchema, prompt, tmpFilePath, 'txt');
                    if (!result.quiz_data || !Array.isArray(result.quiz_data.quiz)) {
                        throw new Error("Invalid AI response: quiz_data is missing or not an array");
                    }
                } catch (error) {
                    throw new Error("AI_GENERATION_FAILED");
                }

                const questionAndAnswer = result.quiz_data.quiz;
                await createQuestionAndAnswer(quizId, questionAndAnswer);
                

                await updateDeck(deckId, {made_to_quiz_at: timeStamp});

                const quizObject = await getQuizByID(quizId, "multiple-choice");
                const quizzes =  quizObject.questions;
                
                const shuffledQuizzes = fischerYatesShuffle(quizzes);

                let numToReturn = numOfQuiz;

                if (numToReturn === null || numToReturn === undefined) {
                    // 4. Edge case: No numOfCards provided
                    numToReturn = Math.ceil(shuffledQuizzes.length * 0.5); // Default to 50%
                }

                if (numToReturn > shuffledQuizzes.length) {
                    const error = new Error("Requested number of flashcards exceeds available cards.");
                    error.name = "EXCEEDS_AVAILABLE_CARDS";
                    throw error;
                }

                const selectedQuizzes = shuffledQuizzes.slice(0, numToReturn);

                quizObject.questions = selectedQuizzes;

                statusCode = 200;
                data = {quizContent: quizObject}
                message = `Quiz creation for new flashcards in deck ${deckId} is successful`
            } else {
                const quizObject = await getQuizByID(quizId, "multiple-choice");
                const quizzes =  quizObject.questions;

                const shuffledQuizzes = fischerYatesShuffle(quizzes);

                let numToReturn = numOfQuiz;

                if (numToReturn === null || numToReturn === undefined) {
                    // 4. Edge case: No numOfCards provided
                    numToReturn = Math.ceil(shuffledQuizzes.length * 0.5); // Default to 50%
                }

                if (numToReturn > shuffledQuizzes.length) {
                    const error = new Error("Requested number of flashcards exceeds available cards.");
                    error.name = "EXCEEDS_AVAILABLE_CARDS";
                    throw error;
                }

                const selectedQuizzes = shuffledQuizzes.slice(0, numToReturn);

                quizObject.questions = selectedQuizzes;

                statusCode = 200;
                data = {quizContent: quizObject};
                message = `There is already a quiz made for this deck in the 'quiz' collection`
            }
        }
    } catch (error) {
        console.log(error);
        
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
    const prompt = `You are an expert quiz generator. Based on the provided flashcards inside the uploaded file, create a well-balanced multiple-choice quiz. 
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
    1. Analyze the provided definition-term pairs
    2. STRICTLY do not use the id to create questions, only the definition and term.
    3. Generate exactly ${number} well-structured questions.
    4. Strictly follow the expected output format below.

    ## Sample input format ##
    {
      "id": "i7QfG8FFwBJhP97Ns5wC",
      "definition": "A mathematical notation used to describe the average-case performance or a tight bound on an algorithm's growth rate.",
      "term": "Big Theta Notation"
    },
    {
      "id": "jkfzboKhtkyRF80VHn7E",
      "definition": "A mathematical notation that describes the best-case performance or the lower bound of an algorithm's growth rate.",
      "term": "Big Omega Notation"
    },
    {
      "id": "oIptWvSrCj2QkCxOAc01",
      "definition": "test",
      "term": "test"
    },

    ## Expected sample output format ##
    {
        "quiz": [
            {
                "question": "Which notation is used to express an algorithm’s average-case growth rate or its precise asymptotic behavior?",
                "related_flashcard_id": "i7QfG8FFwBJhP97Ns5wC",
                "choices": [
                    { "text": "Big Theta Notation", "is_correct": true },
                    { "text": "Big O Notation", "is_correct": false },
                    { "text": "Big Omega Notation", "is_correct": false },
                    { "text": "Little o Notation", "is_correct": false }
                ]
            },
            {
                "question": "When analyzing the best-case scenario for an algorithm, which mathematical notation should be applied?",
                "related_flashcard_id": "jkfzboKhtkyRF80VHn7E",
                "choices": [
                    { "text": "Big Omega Notation", "is_correct": true },
                    { "text": "Big Theta Notation", "is_correct": false },
                    { "text": "Big O Notation", "is_correct": false },
                    { "text": "Amortized Analysis", "is_correct": false }
                ]
            }
        ],
        "errorMessage": null
    }`;
    return prompt;
}



