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

import { cleanTitle } from '../utils/utils.js';
import { sendPromptFlashcardGeneration } from './aiService.js';
import { cleanupTempFile, downloadFile, downloadPdf } from "../repositories/fileRepository.js";
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
    const { subject, topic, deckDescription, fileName, fileExtension, numberOfFlashcards, title, description, coverPhoto  } = request.body;
    
    const coverPhotoRef = coverPhoto ?? 'https://firebasestorage.googleapis.com/v0/b/deck-f429c.appspot.com/o/deckCovers%2Fdefault%2FdeckDefault.png?alt=media&token=de6ac50d-13d0-411c-934e-fbeac5b9f6e0';

    // Explicit null/undefined + non‐empty check
    const isTherePdf = fileName != null && fileName.trim() !== '';

    const prompt = constructFlashCardGenerationPrompt(topic, subject, deckDescription, numberOfFlashcards, isTherePdf);
    let filePath = '';

    if (fileName?.trim()) {
        if (!fileExtension?.trim()) {
            return { 
                status: 422, 
                message: 'An error occured during the generation of deck', 
                data: {
                    error: 'MISSING_FILE_EXTENSION',
                    message: 'File extension is a required field if file is given.'
                }
            };
        }

        try {
            filePath = await downloadFile(fileName, fileExtension, id);

            if (!filePath){
                return { 
                    status: 500, 
                    message: 'An error occured during the generation of deck', 
                    data: {
                        error: 'FILE_RETRIEVAL_FAILURE',
                        message: 'Error retrieving the file from the server.'
                    }
                };
            } 

            const response = await sendPromptFlashcardGeneration(true, prompt, filePath, fileExtension);
            console.log("this is the response"+response);
            
            const flashcards = response.data.terms_and_definitions;
            const deckId = await createDeck({
                created_at: timeStamp,
                is_deleted: false,
                is_private: true,
                title: cleanTitle(title),
                description: description,
                flashcard_count: flashcards.length,
                owner_id: id,
                cover_photo: coverPhotoRef
            });

            await createFlashcard(deckId, flashcards);

            return {
                status: 200,
                request_owner_id: id,
                message: response.message,
                data: {
                    deck_id: deckId
                }
            };
        } catch (error) {
            console.log(error);
            return {
                status: 500,
                request_owner_id: id,
                message: 'An Error has occured while sending information to AI.',
                data: {
                    error: 'UNKNOWN_SERVER_ERROR',
                    message: 'An unknown error was encountered. Please try again later'
                }
            };
        } finally {
            cleanupTempFile(filePath);
        }
    } else {
        try {
            const response = await sendPromptFlashcardGeneration(false, prompt);
          
            const flashcards = response.data.terms_and_definitions;
            
            const deckId = await createDeck({
                created_at: timeStamp,
                is_deleted: false,
                is_private: true,
                title: cleanTitle(title),
                description: description,
                flashcard_count: flashcards.length,
                owner_id: id,
                cover_photo: coverPhotoRef
            });

            await createFlashcard(deckId, flashcards);

            return {
                status: 200,
                request_owner_id: id,
                message: response.message,
                data: {
                    deck_id: deckId
                }
            };
        } catch (error) {
            console.log(error);
            return {
                status: 500,
                request_owner_id: id,
                message: 'An Error has occured while sending information to AI.',
                data: {
                    error: 'UNKNOWN_SERVER_ERROR',
                    message: 'An unknown error was encountered. Please try again later'
                }
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
 * @param {boolean} isTherePdf - Whether there is an uploaded PDF to use.
 * @returns {string} - The constructed JSON prompt.
 */
export function constructFlashCardGenerationPrompt(
    topic,
    subject,
    addDescription,
    numberOfFlashcards,
    isTherePdf
  ) {
    let prompt = "I want you to act as a professor providing students with academic terminologies and their definitions. ";
  
    // Core context
    if (subject)     prompt += `The subject is **${subject}**. `;
    if (topic)       prompt += `The topic is **${topic}**. `;
    if (addDescription) prompt += `Additional context: ${addDescription}. `;
  
    // PDF instruction
    if (isTherePdf) {
      prompt += "Use the content of the provided PDF as source material to inform your terms and definitions. ";
    }
  
    // Generation instructions
    const instruction = `
  ### Instructions:
  - Provide exactly **${numberOfFlashcards}** academic terms along with their definitions.
  - Ensure all terms are **concise, relevant, and clearly defined**.
  - **Definitions should be at most one to two sentences long.**
  - **Do not include** computations, numerical problem-solving examples, or trivia questions.
  - **Avoid terms that begin with** "Who," "What," "Where," or "When."
  - **Reject non-academic, offensive, or inappropriate prompts** and return an error.
  
  `;
  
    // Expected JSON output format
    const outputFormat = `### Expected Output Format:
  {
    "terms_and_definitions": [
      { "term": "Variable",   "definition": "A symbol, usually a letter, representing an unknown numerical value in an algebraic expression or equation." },
      { "term": "Equation",   "definition": "A mathematical statement asserting the equality of two expressions, typically containing one or more variables." }
    ]
  }`;
  
    return prompt + instruction + outputFormat;
  }
  

