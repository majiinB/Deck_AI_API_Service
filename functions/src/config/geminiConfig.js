/**
 * Google Generative AI Configuration Module
 *
 * @file geminiConfig.js
 * @description This module sets up and exports configurations for interacting with Google's Generative AI, 
 * specifically the Gemini model. It initializes essential objects such as `GoogleGenerativeAI` and 
 * `GoogleAIFileManager` to manage generative tasks and files. Additionally, it defines configuration options 
 * to fine-tune generation outputs.
 *
 * External Dependencies:
 * - dotenv: Loads environment variables from a `.env` file into `process.env`.
 * - @google/generative-ai: Provides access to Google's Generative AI SDK.
 *
 * Key Exports:
 * - `fileManager`: Manages file operations related to generative AI tasks.
 * - `genAI`: An instance of `GoogleGenerativeAI` for interacting with AI models.
 * - `model`: A specific instance of the Gemini model for generation tasks.
 * - `generationConfig`: Configuration object for customizing AI generation outputs.
 *
 * Usage:
 * - Import these exports in the relevant parts of your project where generative AI features are needed.
 * - Ensure the `.env` file contains the required `GEMINI_API_KEY` to avoid runtime issues.
 *
 * @module geminiConfig
 * 
 * @author Arthur M. Artugue
 * @created 2024-06-10
 * @updated 2024-10-26
 */

import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { isJson } from '../utils/utils.js';

// Load environment variables from .env file
dotenv.config();

/**
 * API key for authenticating requests to Google Generative AI services.
 * Fetched from the environment variables for security.
 */
const apiKey = process.env.GEMINI_API_KEY.toString();

/**
 * File manager for handling generative AI file operations.
 * Uses the provided API key for authentication.
 */
export const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Instance of GoogleGenerativeAI for interacting with the AI models.
 */
export const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Configuration options to control the behavior of AI-generated responses.
 * - temperature: Controls randomness (higher = more random responses).
 * - topP: Sets nucleus sampling (selects tokens from the top 95% probability mass).
 * - topK: Limits token sampling to the top K most likely tokens.
 * - maxOutputTokens: Maximum number of tokens the output can contain.
 * - responseMimeType: MIME type of the response (JSON in this case).
 */

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
];

/**
 * Instance of the specific generative model (Gemini) used for AI tasks.
 * This model provides flashcard-like generation features.
 */
export const getModel = (format = null, model = "gemini-1.5-flash") => {

    if (!model) {
        model = "gemini-1.5-flash"
    }

    let generationConfig = {
        temperature: 0.8,            // Randomness level for response generation
        topP: 0.95,                  // Nucleus sampling threshold
        topK: 64,                    // Top-K sampling limit
        maxOutputTokens: 8192,       // Maximum number of tokens in the output
        responseMimeType: "application/json"  // MIME type of the generated response
    };

    if (format !== null) {
        if (isJson(format)) {
            generationConfig = {
                temperature: 0.8,            // Randomness level for response generation
                topP: 0.95,                  // Nucleus sampling threshold
                topK: 64,                    // Top-K sampling limit
                maxOutputTokens: 8192,       // Maximum number of tokens in the output
                responseMimeType: "application/json",  // MIME type of the generated response
                responseSchema: format
            };
        }
    }

    return genAI.getGenerativeModel({
        model: model,
        generationConfig: generationConfig,
        // safetySettings: safetySettings
    });
}


