/**
 * Deck API - Moderation Router
 *
 * @file moderationRoute.js
 * @description This module defines the routes for the Deck API, which interacts Gemini services 
 * to do AI-based moderation on flashcards. 
 *
 * Routes:
 * - /v2/gemini/:id: Handles requests through Gemini for doing AI-based deck content moderation.
 *
 * Middleware:
 * - express.json(): Parses incoming request bodies in JSON format.
 *
 * External Dependencies:
 * - Gemini: Configured Gemini instance for interacting with the Google Gemini API.
 * - Firebase: Firebase App initialization for configuration management.
 * 
 * @module router
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-20
 * @updated 2025-03-20
 */

import express from 'express';
import { verifyFirebaseToken } from '../config/firebaseAdminConfig.js';
import { geminiModerationController } from '../controllers/moderationController.js';

const router = express.Router();

/**
 * Route: POST /moderate/:id
 * Description: Handles requests to generate questions using Google AI prompt construction. 
 * Supports both file-based and manual input.
 * Parameters:
 *   - id: Unique identifier from the request URL
 * Request Body:
 *   - deckId: The UID of a deck in the database that will be checked or moderated
 */
router.post('/', verifyFirebaseToken, geminiModerationController) // put verifyFirebaseToken as second parameter to enable jwt verification

export default router;
