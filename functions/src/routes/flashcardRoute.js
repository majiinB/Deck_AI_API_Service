/**
 * Deck API - Router
 *
 * @file router.js
 * @description This module defines the routes for the Deck API, which interacts with OpenAI and Gemini services 
 * to generate AI-based flashcards, and responses. It handles PDF downloads, text extraction, 
 * and prompt construction for various scenarios.
 *
 * Routes:
 * - /v1/openAI/:id: Handles AI prompt-related requests using OpenAI, with optional PDF input for content generation.
 * - /v2/gemini/:id: Handles requests through Gemini for generating content and flashcards with or without file input.
 *
 * Middleware:
 * - express.json(): Parses incoming request bodies in JSON format.
 *
 * External Dependencies:
 * - openai: Configured OpenAI instance for interacting with the OpenAI API.
 * - firebase: Firebase App initialization for configuration management.
 * - Utility functions: Includes helper functions like PDF download, extraction, and validation checks.
 *
 * Functions:
 * - createThread: Creates or retrieves a thread for OpenAI-based prompts.
 * - downloadPdf, extractPdfText, deleteFile: Handle PDF operations.
 * - isValidInteger: Validates if the input is a valid integer.
 * - constructGoogleAIPrompt, sendPrompt: Gemini-related prompt handling.
 *
 * Server:
 * - These routes are part of the Express application and integrate with the main server.
 *
 * @module router
 * 
 * @author Arthur M. Artugue
 * @created 2024-06-10
 * @updated 2025-03-20
 */

import express from 'express';
import { geminiFlashcardController } from '../controllers/flashcardController.js';
import { verifyFirebaseToken } from '../config/firebaseAdminConfig.js';

const router = express.Router();

/**
 * Route: POST /generate/:id
 * Description: Handles requests to generate deck of flashcards using Google AI prompt construction. 
 * Supports both file-based and manual input.
 * Parameters:
 *   - id: Unique identifier from the request URL
 * Request Body:
 *   - subject: Subject of the flashcard (optional if file is provided)
 *   - topic: Topic of the flashcard (optional if file is provided)
 *   - addDescription: Additional context or description (optional)
 *   - fileName: Name of the uploaded file (optional)
 *   - fileExtension: File extension (e.g., pdf, txt)
 *   - numberOfFlashcards: Number of flashcards to generate (2-20)
 */
router.post('/:id', geminiFlashcardController) // put verifyFirebaseToken as second parameter to enable jwt verification

export default router;
