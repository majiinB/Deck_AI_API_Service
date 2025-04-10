/**
 * Deck API - Moderation Controller
 * 
 * @file moderationController.js
 * @description Handles AI moderation requests using Gemini AI.
 * 
 * This module provides controllers for processing AI-based moderation requests. 
 * It validates user input and interacts with the respective AI services.
 * 
 * @module moderationController
 * 
 * @requires ../services/moderationService.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-20
 * @updated 2025-02-22
 */

import { geminiModerationService } from '../services/moderationService.js';

export const geminiModerationController = async (req, res) => {
    const { deckId } = req.body;
    const userId = req.params.id;

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
        const result = await geminiModerationService(deckId, userId);

        return res.status(result.status).send(result);
    } catch (error) {
        console.error("Unexpected error in moderation:", error);
        return res.status(500).json(
            {
                status: 400,
                request_owner_id: userId,
                message: "An unexpected error occurred during moderation.",
                data: null
            }
        );
    }
}