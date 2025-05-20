/**
 * Deck API - Moderation Router
 *
 * @file quizRoute.js
 * @description This module defines the routes for the Deck API, which interacts Gemini services and generates 
 * quiz based on the provided deck. 
 *
 * External Dependencies:
 * - Gemini: Configured Gemini instance for interacting with the Google Gemini API.
 * - Firebase: Firebase App initialization for configuration management.
 * 
 * @module router
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-27
 * @updated 2025-03-20
 */

import express from 'express';
import { verifyFirebaseToken } from '../config/firebaseAdminConfig.js';
import { geminiQuizController } from '../controllers/quizController.js';

const router = express.Router();

/**
 * Route: POST /v2/deck/quiz/generate/:id
 * Description: Handles requests to generate quiz using Google AI. 
 * Parameters:
 *   - id: Unique identifier from the request URL
 * Request Body:
 *   - deckId: The UID of a deck in the database that will be the reference for creating the quiz.
 */
router.post('/', verifyFirebaseToken, geminiQuizController) // put verifyFirebaseToken as second parameter to enable jwt verification

export default router;
