/**
 * Deck API - Prompt Controller
 * 
 * @file promptController.js
 * @description Handles AI prompt requests for Gemini and OpenAI.
 * 
 * This module provides controllers for processing AI-generated flashcard prompts. 
 * It validates user input and interacts with the respective AI services.
 * 
 * @module promptController
 * 
 * @requires ../services/flashcardService.js
 * @requires ../utils/utils.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-12
 * @updated 2025-03-19
 */

import { geminiFlashcardService } from '../services/flashcardService.js';
import { isValidInteger } from '../utils/utils.js';

/**
 * Handles AI prompt requests using Gemini AI.
 * 
 * @async
 * @function geminiFlashcardController
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response with generated prompts or an error message.
 */
export const geminiFlashcardController = async (req, res) => {
    const { subject, topic, fileName, numberOfFlashcards, title, description, coverPhoto } = req.body;
    const userID = req.user?.user_id;

    // Validate input: Either file or both subject or topic is required
    if (!fileName?.trim() && (!subject?.trim() || !topic?.trim())) {
        return res.status(400).json({
                status: 400,
                request_owner_id: userID,
                message: 'An error occured during the generation of deck',
                data: {
                    error: 'LACK_OF_INFO_AND_CONTEXT',
                    message: 'Subject or topic is required if no file was given as a ' +
                    'basis for what the deck generated is all about'
                }
            });
    }

    if (!title?.trim()) {
        return res.status(400).json({
                status: 400,
                request_owner_id: userID,
                message: 'An error occured during the generation of deck',
                data: {
                    error: 'MISSING_REQUIRED_FIELD_TITLE',
                    message: 'request is missing the required field: title'
                }
            });
    }

    if (!description?.trim()) {
        return res.status(400).json({
                status: 400,
                request_owner_id: userID,
                message: 'An error occured during the generation of deck',
                data: {
                    error: 'MISSING_REQUIRED_FIELD_DESCRIPTION',
                    message: 'request is missing the required field: description'
                }
            });
    }

    // Validate the number of flashcards
    if (!isValidInteger(numberOfFlashcards)) {
        return res.status(422).json({ 
            status: 422,
            request_owner_id: userID,
            message: 'An error occured during the generation of deck',
            data: {
                error: 'INVALID_NUMBER',
                message: 'Invalid number of flashcards. It must be between 10 and 50.'
            }
        });
    }

    const coverPhotoRegex = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/deck-f429c\.appspot\.com\/o\/deckCovers%2F[\w-]+%2F[\w-]+(?:\.(png|jpg|jpeg|webp))?\?alt=media&token=[\w-]+$/;

    if (coverPhoto && !coverPhotoRegex.test(coverPhoto)) {
        return res.status(400).json({
            status: 400,
            request_owner_id: userID,
            message: 'An error occurred during the generation of deck',
            data: {
                error: 'INVALID_COVER_PHOTO_URL',
                message: 'coverPhoto must be a valid Firebase Storage image URL'
            }
    });
}

    const result = await geminiFlashcardService(req, userID);
    res.status(result.status).json(result);
    return;
}
