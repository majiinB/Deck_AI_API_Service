/**
 * Deck API - Quiz Controller
 * 
 * @file quizController.js
 * @description Handles AI quiz generation requests using Gemini AI.
 * 
 * This module provides controllers for processing AI-based quiz generation requests. 
 * It validates user input and interacts with the respective AI services.
 * 
 * @module moderationController
 * 
 * @requires ../services/quizService.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-27
 * @updated 2025-02-27
 */

import { geminiQuizService } from '../services/quizService.js';

export const geminiQuizController = async (req, res) => {
    const { deckId } = req.body;
    const userId = req.user?.user_id;

    if (!deckId || !deckId.trim()) {
        return res.status(400).json(
            {
                status: 400,
                request_owner_id: userId,
                message: "The parameter 'deckId' can't be empty or null",
                data: null
            }
        );
    }

    try {
        const result = await geminiQuizService(deckId, userId);

        return res.status(result.status).send(result);
    } catch (error) {
        console.error("Unexpected error in quiz generation:", error);
        return res.status(500).json(
            {
                status: 400,
                request_owner_id: userId,
                message: "An unexpected error occurred during guiz generation.",
                data: null
            }
        );
    }
}