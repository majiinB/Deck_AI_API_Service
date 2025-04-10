/**
 * Deck API - Prompt Service
 *
 * @file flashcardService.js
 * @description Provides services for processing AI-generated flashcard prompts.
 * 
 * This module interacts with AI models (Gemini and OpenAI) to generate flashcards based on user input.
 * It handles file retrieval, prompt construction, and API communication.
 * 
 * @module flashcardService
 * 
 * @requires ../utils/utils.js
 * @requires ../services/aiService.js
 * @requires ../repositories/fileRepository.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-12
 * @updated 2025-03-20
 * 
 */

import { cleanTitle, deleteFile } from '../utils/utils.js';
import { sendPromptFlashcardGeneration } from './aiService.js';
import { downloadFile, downloadPdf } from "../repositories/fileRepository.js";
import { createDeck, createFlashcard } from '../repositories/deckRepository.js';
import { timeStamp } from '../config/firebaseAdminConfig.js';

/**
 * Generates AI-generated flashcards using Gemini.
 *
 * @async
 * @function geminiFlashcardService
 * @param {Object} request - The HTTP request object.
 * @param {string} id - The request owner ID.
 * @returns {Promise<Object>} Response object containing the generated flashcards or error message.
 */
export const geminiFlashcardService = async (request, id) => {
    const { subject, topic, addDescription, fileName, fileExtension, numberOfFlashcards, deckTitle, coverPhotoRef  } = request.body;
    
    const coverPhoto = coverPhotoRef || 'https://firebasestorage.googleapis.com/v0/b/deck-f429c.appspot.com/o/deckCovers%2Fdefault%2FdeckDefault.png?alt=media&token=de6ac50d-13d0-411c-934e-fbeac5b9f6e0';

    const prompt = constructFlashCardGenerationPrompt(topic, subject, addDescription, numberOfFlashcards);

    if (fileName?.trim()) {
        if (!fileExtension?.trim()) return { status: 422, message: 'File extension is required.', data: null };

        try {
            const filePath = await downloadFile(fileName, fileExtension, id);

            if (!filePath) return { status: 500, message: 'Error retrieving the file from the server.', data: null };

            const response = await sendPromptFlashcardGeneration(true, prompt, filePath, fileExtension);
            const flashcards = response.data.terms_and_definitions;
            const deckId = await createDeck({
                created_at: timeStamp,
                is_deleted: false,
                is_private: true,
                title: cleanTitle(deckTitle),
                owner_id: id,
                cover_photo: coverPhoto
            });

            await createFlashcard(deckId, flashcards);

            return {
                status: 200,
                request_owner_id: id,
                message: response.message,
                data: {
                    deckId: deckId
                }
            };
        } catch (error) {
            return {
                status: 500,
                request_owner_id: id,
                message: 'An Error has occured while sending information to AI.',
                data: null
            };
        } finally {
            deleteFile(filePath);
        }
    } else {
        try {
            const response = await sendPromptFlashcardGeneration(false, prompt);
          
            const flashcards = response.data.terms_and_definitions;
            
            const deckId = await createDeck({
                created_at: timeStamp,
                is_deleted: false,
                is_private: true,
                title: cleanTitle(deckTitle),
                owner_id: id,
                cover_photo: coverPhoto
            });

            await createFlashcard(deckId, flashcards);

            return {
                status: 200,
                request_owner_id: id,
                message: response.message,
                data: {
                    deckId: deckId // Replace with flashcards to show the processed ai response
                }
            };
        } catch (error) {
            console.error('Error during file retrieval:', error);
            return {
                status: 500,
                request_owner_id: id,
                message: 'An Error has occured and while retrieving response from AI',
                data: null
            };
        }
    }
}

/**
 * Constructs a JSON prompt for the Google AI model.
 * 
 * @param {string} topic - The topic for the flashcard.
 * @param {string} subject - The subject area for the flashcard.
 * @param {string} addDescription - Additional description for the prompt.
 * @param {number} numberOfFlashcards - Number of flashcards to generate.
 * @returns {string} - The constructed JSON prompt.
 */
export function constructFlashCardGenerationPrompt(topic, subject, addDescription, numberOfFlashcards) {
    let prompt = "I want you to act as a professor providing students with academic terminologies and their definitions. ";
    
    if (subject) prompt += `The subject is **${subject}**. `;
    if (topic) prompt += `The topic is **${topic}**. `;
    if (addDescription) prompt += `Additional context: ${addDescription}. `;

    let instruction = `\n\n### Instructions:\n` +
        `- Provide exactly **${numberOfFlashcards}** academic terms along with their definitions.\n` +
        `- Ensure all terms are **concise, relevant, and clearly defined**.\n` +
        `- **Definitions should be at most one to two sentences long.**\n` +
        `- **Do not include** computations, numerical problem-solving examples, or trivia questions.\n` +
        `- **Avoid terms that begin with** "Who," "What," "Where," or "When.".\n` +
        `- **Reject non-academic, offensive, or inappropriate prompts** and return an error.\n\n`;

    let outputFormat = `### Expected Output Format:\n` +
        `{\n  "terms_and_definitions": [\n` +
        `    { "term": "Variable", "definition": "A symbol, usually a letter, representing an unknown numerical value in an algebraic expression or equation." },\n` +
        `    { "term": "Equation", "definition": "A mathematical statement asserting the equality of two expressions, typically containing one or more variables." }\n  ]\n}`;

    return prompt + instruction + outputFormat;
}

