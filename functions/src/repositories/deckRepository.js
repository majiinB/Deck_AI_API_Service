/**
 * Deck Repository
 * 
 * @file deckRepository.js
 * @description Handles database operations related to deck retrieval.
 * 
 * This module provides functions to fetch deck data from Firestore,
 * ensuring proper validation and error handling.
 * 
 * @module deckRepository
 * 
 * @requires ../config/firebaseAdminConfig.js
 * @requires ../models/deckModel.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-21
 * @updated 2025-03-19
 */

import { logger } from 'firebase-functions';
import { db, timeStamp } from '../config/firebaseAdminConfig.js';
import { formatDeck } from '../models/deckModel.js';

/**
 * Fetches a deck by its ID from Firestore.
 * 
 * @async
 * @function getDeckById
 * @param {string} deckId - The unique identifier of the deck.
 * @returns {Promise<Object>} - Returns a formatted deck object.
 * @throws {Error} - Throws an error if the deck ID is invalid, not found, or has no valid flashcards.
 */
export const getDeckById = async (deckId) => {
    try {
        // Validate inputs
        if (!deckId || typeof deckId !== 'string') {
            throw new Error("INVALID_DECK_ID");
        }

        const deckRef = db.collection("decks").doc(deckId);
        const deckSnap = await deckRef.get();
    
        // If deck does not exist
        if (!deckSnap.exists) throw new Error("DECK_NOT_FOUND");
    
        const flashcardSnap = await deckRef.collection("flashcards").where("is_deleted", "==", false).get();
        const flashcards = flashcardSnap?.docs?.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    
        if (flashcards.length === 0) throw new Error("NO_VALID_FLASHCARDS");
    
        const deckData = deckSnap.data();

        return formatDeck(deckSnap.id, deckData, flashcards);
    } catch (error) {
        console.error(`Error in getDeckById (deckId: ${deckId}):`, error);
        throw new Error(error.message);
    }
};

/**
 * Fetches a deck by its ID from Firestore.
 * 
 * @async
 * @function getDeckById
 * @param {string} deckId - The unique identifier of the deck.
 * @returns {Promise<Object>} - Returns a formatted deck object.
 * @throws {Error} - Throws an error if the deck ID is invalid, not found, or has no valid flashcards.
 */
export const getDeckAndCheckField = async (deckId, fieldName) => {
    try {
        // Validate inputs
        if (!deckId || typeof deckId !== 'string') {
            logger.error(
                "Deck was retrieved to check a field, but failed -",
                "ERROR: INVALID_DECK_ID -",
                "Deck ID provided? ", !deckId, "-",
                "Deck ID is a type of string?", 
                typeof deckId !== 'string',
            );
            throw new Error("INVALID_DECK_ID");
        }
        if (!fieldName || typeof fieldName !== 'string') {
            logger.error(
                "Deck was retrieved to check a field, but failed -",
                "ERROR: INVALID_DECK_ID -",
                "Deck ID provided? ", !fieldName, "-",
                "Deck ID is a type of string?", 
                typeof fieldName !== 'string',
            );
            throw new Error("INVALID_FIELD_NAME");
        }

        // Fetch deck document
        const deckRef = db.collection('decks').doc(deckId);
        const deckSnap = await deckRef.get();

        if (!deckSnap.exists) {
            logger.error(
                "Deck was retrieved to check a field, but failed -",
                "ERROR: DECK_NOT_FOUND -",
                "Deck ID provided? ", !deckId, "-",
                "Deck ID is a type of string?", 
                typeof deckId !== 'string',
            );
            throw new Error("DECK_NOT_FOUND");
        }

        const deckData = deckSnap.data();
        
        if (!deckData.hasOwnProperty(fieldName))  {
            logger.info(
                "Deck was retrieved to check a field -",
                "Deck exists?", true, "-",
                "Deck property exists?", false,
            );
            return {
                exists: true,
                field_exists: false,
                data: null
            }
        };

        logger.info(
            "Deck was retrieved to check a field -",
            "Deck exists? ", true, "-",
            "Deck property exists? ", true,
        );
        return { 
            exists: true, 
            field_exists: true, 
            data: deckData[fieldName] 
        };

    } catch (error) {
        logger.error(`Error in getDeckAndCheckField (deckId: ${deckId}, fieldName: ${fieldName}):`, error);
        throw new Error(error.message);
    }
};

/**
 * Updates a deck document in Firestore with the provided data.
 * 
 * @async
 * @function updateDeck
 * @param {string} deckId - The unique identifier of the deck to update.
 * @param {Object} data - The key-value pairs representing the fields to update.
 * @returns {Promise<void>} - Resolves if the update is successful.
 * @throws {Error} - Throws an error if the deck ID is invalid, the update data is not an object, or the update operation fails.
 */
export const updateDeck = async (deckId, data) => {
    try {
        // Validate inputs
        if (!deckId || typeof deckId !== 'string') {
            throw new Error("INVALID_DECK_ID");
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error("INVALID_UPDATE_DATA");
        }

        const deckRef = db.collection('decks').doc(deckId);
        await deckRef.update(data);
    } catch (error) {
        console.error(`Error in updateDeck (deckId: ${deckId}, data: ${data})`, error);
        throw new Error(error.message);
    }
}

/**
 * Fetches newly created flashcards for a given deck based on its last update time.
 * 
 * @async
 * @function getNewFlashcards
 * @param {string} deckId - The unique identifier of the deck.
 * @returns {Promise<Array<Object>>} - Returns an array of new flashcards.
 * @throws {Error} - Throws an error if the deck ID is invalid, the deck is not found, or the query operation fails.
 */
export const getNewFlashcards = async (deckId, quizUpdateDate) => {
    try {
        // Validate input
        if (!deckId || typeof deckId !== "string") {
            throw new Error("INVALID_DECK_ID");
        }

        // Reference to the deck document
        const deckRef = db.collection("decks").doc(deckId);
        const deckSnap = await deckRef.get();

        // Check if deck exists
        if (!deckSnap.exists) {
            throw new Error("DECK_NOT_FOUND");
        }

        // Retrieve last updated timestamp
        const deckData = deckSnap.data();
        let madeToQuizAt = deckData?.made_to_quiz_at;
        
        if (!madeToQuizAt && (quizUpdateDate != "")) {
            await updateDeck(deckId, {made_to_quiz_at: quizUpdateDate});
            madeToQuizAt = quizUpdateDate;
        }

        // Query new flashcards created after the last update
        const flashcardSnap = await deckRef
            .collection("flashcards")
            .where("is_deleted", "==", false)
            .where("created_at", ">=", madeToQuizAt) 
            .get();

        // Extract flashcard data
        const flashcards = flashcardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

        return flashcards;
    } catch (error) {
        console.error(`Error in getNewFlashcards (deckId: ${deckId}):`, error);
        throw new Error(error.message);
    }
};

/**
 * Creates a new deck in the Firestore database.
 *
 * @async
 * @function createDeck
 * @param {Object} deckData - The data for the new deck.
 * @param {string} deckData.created_at - The timestamp when the deck is created.
 * @param {boolean} deckData.is_deleted - Whether the deck is deleted (soft delete flag).
 * @param {boolean} deckData.is_private - Whether the deck is private.
 * @param {string} deckData.title - The cleaned title of the deck.
 * @param {string} deckData.owner_id - The ID of the deck's owner.
 * @param {string} [deckData.cover_photo] - (Optional) URL of the deck's cover photo.
 * @returns {Promise<string>} The unique ID of the newly created deck.
 * @throws {Error} If the input data is invalid or Firestore operation fails.
 */
export const createDeck = async (deckData) => {
    try {
        // Validate input
        if (!deckData || typeof deckData !== 'object') {
            throw new Error("INVALID_QUIZ_DATA");
        }

        const res = await db.collection('decks').add(deckData);
        return res.id;
    } catch (error) {
        console.error(`Create deck function error: ${error}`);
        throw new Error(error.message);
    }
}

/**
 * Adds flashcards to a specific deck in Firestore.
 *
 * @async
 * @function createFlashcard
 * @param {string} deckId - The ID of the deck to which the flashcards belong.
 * @param {Array<Object>} flashcards - The array of flashcard objects.
 * @param {string} flashcards[].term - The term of the flashcard.
 * @param {string} flashcards[].definition - The definition or answer of the flashcard.
 * @returns {Promise<void>} Resolves when all flashcards are added.
 * @throws {Error} If input validation fails or Firestore operation encounters an error.
 */
export async function createFlashcard(deckId, flashcards) {
    try {
        // Validate inputs
        if (!deckId || typeof deckId !== 'string') {
            throw new Error("INVALID_DECK_ID");
        }
        if (!Array.isArray(flashcards) || flashcards.length === 0) {
            throw new Error("INVALID_TERM_AND_DEFINITION_DATA");
        }

        // Reference to Firestore collection
        const ref = db.collection('decks').doc(deckId).collection('flashcards');

        for (const item of flashcards) {

             if (!item.term || typeof item.term !== 'string') {
                continue;
            }
            if (item.definition && typeof item.definition !== 'string') {
                continue;
            }

            // Add term and definition to Firestore
            await ref.add({
                term: item.term,
                created_at: timeStamp,
                definition: item.definition,
                is_deleted: false,
                is_starred: false,
            });
        }
    } catch (error) {
        console.error(`Error in create flashcard function (quizId: ${deckId}):`, error);
        throw new Error(error.message);
    }
}

