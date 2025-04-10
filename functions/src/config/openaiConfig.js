/**
 * OpenAI Configuration Module
 *
 * @file openaiConfig.js
 * @description This module initializes and exports an instance of the OpenAI client, configured with an API key from
 * environment variables. It also retrieves and exports a specific assistant instance to manage conversations
 * and other AI-powered tasks.
 *
 * External Dependencies:
 * - dotenv: Loads environment variables from a `.env` file into `process.env`.
 * - openai: Provides access to OpenAI’s API for generating responses, managing assistants, and more.
 *
 * Key Exports:
 * - `openai`: The main OpenAI client configured with the API key.
 * - `assistant`: A retrieved instance of an OpenAI assistant, ready for use in applications requiring conversational AI.
 *
 * Usage:
 * - Import the `openai` instance wherever you need to interact with OpenAI's services.
 * - Use the `assistant` export to handle assistant-specific operations like conversations.
 * - Ensure the `.env` file contains the necessary API key and assistant ID to avoid runtime errors.
 *
 * REMOVED SUPPORT FOR OPENAI
 *
 * @module openaiConfig
 *
 * @author Arthur M. Artugue
 * @created 2024-06-10
 * @updated 2025-02-22
 */

// import { OpenAI } from "openai";
// import * as dotenv from 'dotenv';

// // Load environment variables from the .env file
// dotenv.config();

// /**
//  * Initializes the OpenAI client with the provided API key from environment variables.
//  * @type {OpenAI}
//  */
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY.toString(), // API key for authentication
// });

// /**
//  * Retrieves and exports a specific assistant instance from OpenAI.
//  * This assistant can manage conversations or other assistant-related tasks.
//  * @type {Object}
//  */
// export const assistant = await openai.beta.assistants.retrieve(
//     process.env.ASSISTANT_ID.toString() // The ID of the assistant to retrieve, from environment variables
// );

// /**
//  * Default export of the OpenAI client.
//  * Use this instance for interacting with OpenAI services.
//  */
// export default openai;
