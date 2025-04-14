/**
 * Quiz Repository
 * 
 * @file quizRepository.js
 * @description Handles database operations related to deck retrieval.
 * 
 * This module provides functions to fetch deck data from Firestore,
 * ensuring proper validation and error handling.
 * 
 * @module quizRepository
 * 
 * @requires ../config/firebaseAdminConfig.js
 * @requires ../models/deckModel.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-03-05
 * @updated 2025-03-07
 */

import { db, timeStamp } from '../config/firebaseAdminConfig.js';
import { formatDeck } from '../models/deckModel.js';

/**
 * Creates a new quiz document in the Firestore database for a given deck.
 *
 * @async
 * @function createQuizForDeck
 * @param {Object} quizData - The data for the quiz to be created.
 * @param {string} quizData.associated_deck_id - The ID of the deck the quiz is associated with.
 * @param {string} quizData.quiz_type - The type of quiz (e.g., "multiple-choice").
 * @param {boolean} quizData.is_deleted - Indicates whether the quiz is deleted.
 * @param {string} quizData.created_at - The timestamp when the quiz was created.
 * @param {string} quizData.updated_at - The timestamp when the quiz was last updated.
 * @returns {Promise<string>} - Returns the newly created quiz ID.
 * @throws {Error} - Throws an error if quiz creation fails.
 */
export async function createQuizForDeck(quizData) {
    try {
        // Validate input
        if (!quizData || typeof quizData !== 'object') {
            throw new Error("INVALID_QUIZ_DATA");
        }
        if (!quizData.associated_deck_id || typeof quizData.associated_deck_id !== 'string') {
            throw new Error("INVALID_DECK_ID");
        }
        if (!quizData.quiz_type || typeof quizData.quiz_type !== 'string') {
            throw new Error("INVALID_QUIZ_TYPE");
        }
        if (typeof quizData.is_deleted !== 'boolean') {
            throw new Error("INVALID_IS_DELETED_VALUE");
        }
        if (!quizData.created_at) {
            throw new Error("INVALID_CREATED_AT");
        }
        if (!quizData.updated_at) {
            throw new Error("INVALID_UPDATED_AT");
        }

        const res = await db.collection('quiz').add(quizData);
        return res.id;
    } catch (error) {
        console.log(`Create quiz for deck function error: ${error}`);
        throw new Error(error.message);
    }
}

/**
 * Creates question and answer entries for a given quiz in Firestore.
 *
 * @async
 * @function createQuestionAndAnswer
 * @param {string} quizId - The ID of the quiz to which the questions and answers belong.
 * @param {Array<Object>} questionAndAnswer - An array of question objects to be added.
 * @param {string} questionAndAnswer[].question - The text of the question.
 * @param {string} questionAndAnswer[].related_flashcard_id - The ID of the related flashcard (optional).
 * @param {Array<Object>} questionAndAnswer[].choices - The choices associated with the question.
 * @returns {Promise<void>} - Resolves when all questions and choices have been successfully added.
 * @throws {Error} - Throws an error if the input is invalid or if Firestore operations fail.
 */
export async function createQuestionAndAnswer(quizId, questionAndAnswer) {
    try {
        // Validate inputs
        if (!quizId || typeof quizId !== 'string') {
            throw new Error("INVALID_QUIZ_ID");
        }
        if (!Array.isArray(questionAndAnswer) || questionAndAnswer.length === 0) {
            throw new Error("INVALID_QUESTION_AND_ANSWER_DATA");
        }

        // Reference to Firestore collection
        const ref = db.collection('quiz').doc(quizId).collection('question_and_answers');

        for (const item of questionAndAnswer) {

            if (!item.question || typeof item.question !== 'string') {
                continue;
            }
            if (item.related_flashcard_id && typeof item.related_flashcard_id !== 'string') {
                continue;
            }
            if (!Array.isArray(item.choices) || item.choices.length === 0) {
                continue;
            }
            
            // Add question and answer to Firestore
            const questionAndAnswerRef = await ref.add({
                question: item.question,
                created_at: timeStamp,
                related_flashcard_id: item.related_flashcard_id || null, // Allow null values
            });

            // Create choices for the question
            await createChoices(questionAndAnswerRef.id, item.choices, ref);
        }
    } catch (error) {
        console.error(`Error in createQuestionAndAnswer (quizId: ${quizId}):`, error);
        throw new Error(error.message);
    }
}

/**
 * Creates choices for a given question in Firestore.
 *
 * @async
 * @function createChoices
 * @param {string} questionAndAnswerId - The ID of the question for which choices are being created.
 * @param {Array<Object>} choices - An array of choice objects containing text and correctness status.
 * @param {Object} ref - Firestore reference to the parent question document.
 * @param {string} choices[].text - The text of the choice.
 * @param {boolean} choices[].is_correct - Indicates whether the choice is correct.
 * @returns {Promise<void>} - Resolves when all choices have been successfully added.
 * @throws {Error} - Throws an error if input is invalid or Firestore operations fail.
 */
export async function createChoices(questionAndAnswerId, choices, ref) {
    try {
        // Validate inputs
        if (!questionAndAnswerId || typeof questionAndAnswerId !== 'string') {
            throw new Error("INVALID_QUESTION_AND_ANSWER_ID");
        }
        if (!Array.isArray(choices) || choices.length === 0) {
            throw new Error("INVALID_CHOICES_ARRAY");
        }
        if (!ref || typeof ref.doc !== 'function') {
            throw new Error("INVALID_FIRESTORE_REFERENCE");
        }

        // Validate choice structure
        for (const choice of choices) {
            if (!choice.text || typeof choice.text !== 'string') {
                throw new Error("INVALID_CHOICE_TEXT");
            }
            if (typeof choice.is_correct !== 'boolean') {
                throw new Error("INVALID_CHOICE_CORRECTNESS");
            }
        }

        // Add choices to Firestore
        for (const choice of choices) {
            await ref.doc(questionAndAnswerId).collection('choices').add({
                text: choice.text,
                is_correct: choice.is_correct,
            });
        }
    } catch (error) {
        console.error(`Error in createChoices (questionAndAnswerId: ${questionAndAnswerId}):`, error);
        throw new Error(error.message);
    }
}

/**
 * Retrieves quizzes by deck ID and quiz type from Firestore.
 *
 * @async
 * @function getQuizByDeckIDAndQuizType
 * @param {string} deckId - The unique identifier of the deck.
 * @param {string} quizType - The type of the quiz to filter by.
 * @returns {Promise<Array<Object>>} - Returns an array of quiz objects.
 * @throws {Error} - Throws an error if input validation fails or Firestore retrieval fails.
 */
export async function getQuizByDeckIDAndQuizType(deckId, quizType) {
    try {
        // Validate inputs
        if (!deckId || typeof deckId !== 'string') {
            throw new Error("INVALID_DECK_ID");
        }
        if (!quizType || typeof quizType !== 'string') {
            throw new Error("INVALID_QUIZ_TYPE");
        }

        // Query Firestore for quizzes matching deckId and quizType
        const quizSnap = await db.collection('quiz')
            .where("associated_deck_id", "==", deckId)
            .where("quiz_type", "==", quizType)
            .get();

        // Extract quiz data
        const quiz = quizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

        return quiz;

    } catch (error) {
        console.error(`Error in getQuizByDeckIDAndQuizType (deckId: ${deckId}, quizType: ${quizType}):`, error);
        throw new Error(error.message);
    }
}

