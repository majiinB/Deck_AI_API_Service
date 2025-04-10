/**
 * Deck API - Utils
 *
 * @file utils.js
 * @description Provides services for AI-related actions.
 * 
 * This utility module provides helper functions for tasks such as:
 * - Delaying code execution.
 * - Validating integer input.
 * - Creating and managing threads with the OpenAI API.
 * - Extracting text from PDF files.
 * - Deleting files from the local filesystem.
 * - Cleaning string content by removing special characters, multiple spaces, and bullets.
 * 
 * @module utils
 * 
 * @requires ../config/openaiConfig.js
 * @requires pdf.js-extract
 * @requires flashcard
 * 
 * @author Arthur M. Artugue
 * @created 2024-06-10
 * @updated 2025-02-19
 * 
 */


import { PDFExtract } from 'pdf.js-extract';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Delays the execution by the specified milliseconds.
 * @param {number} ms - Time to delay in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if a value is a valid integer within a specific range.
 * @param {*} value - The value to validate.
 * @returns {boolean} - True if the value is an integer between 2 and 20, otherwise false.
 */
export function isValidInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 1 && value <= 20;
}

/**
 * Creates or retrieves a thread based on the input parameters.
 * @param {boolean} isNewMessage - Indicates if a new thread is to be created.
 * @param {string} givenThread - An existing thread ID or 'no_thread_id' if not applicable.
 * @returns {Promise<string>} - The ID of the created or provided thread.
 */
export async function createThread(isNewMessage, givenThread) {
    let thread;
    let threadObj;

    if (isNewMessage) {
        threadObj = await openai.beta.threads.create();
        thread = threadObj.id;
    } else if (!isNewMessage && givenThread !== "no_thread_id") {
        thread = givenThread;
    }
    return thread;
}

/**
 * Extracts and concatenates text from a PDF file.
 * @param {string} pdfFilePath - The path to the PDF file.
 * @returns {Promise<string>} - A promise that resolves with the extracted text.
 */
export function extractPdfText(pdfFilePath) {
    return new Promise((resolve, reject) => {
        try {
            const pdfExtract = new PDFExtract();
            const options = { normalizeWhitespace: true };

            pdfExtract.extract(pdfFilePath, options, (err, data) => {
                if (err) {
                    console.error('Error extracting PDF:', err);
                    reject(err);
                } else {
                    const { pages } = data;
                    let concatenatedText = '';

                    pages.forEach((page, pageIndex) => {
                        console.log(`Content of Page ${pageIndex + 1}:`);
                        page.content.forEach(textElement => {
                            console.log(`String content: ${textElement.str}`);
                            concatenatedText += textElement.str;
                        });
                    });

                    resolve(cleanString(concatenatedText));
                }
            });
        } catch (error) {
            console.error('Error parsing PDF:', error);
            reject(error);
        }
    });
}

/**
 * Deletes a file from the file system.
 * @param {string} filePath - The path to the file to delete.
 * @returns {boolean} - True if the file was successfully deleted, otherwise false.
 */
export function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
        console.log('File deleted successfully');
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('File does not exist');
            return false;
        } else {
            console.error('Error deleting file:', err);
            return false;
        }
    }
}

/**
 * Cleans a string by removing special characters, multiple spaces, and bullets.
 * @param {string} inputString - The string to clean.
 * @returns {string} - The cleaned string.
 */
export function cleanString(inputString) {
    let cleanedString = inputString.replace(/[^\w\s]/gi, '');  // Remove special characters
    cleanedString = cleanedString.replace(/\s{2,}/g, ' ');     // Remove multiple spaces
    cleanedString = cleanedString.replace(/•/g, '');            // Remove bullet characters
    return cleanedString;
}

export function isJson(obj) {
    try {
        JSON.parse(obj);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the MIME type for a given file extension.
 * 
 * @param {string} extension - The file extension (e.g., 'pdf', 'jpg').
 * @returns {string} - The corresponding MIME type or 'application/octet-stream' if not found.
 */
export function getMimeType(extension) {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return mime.getType(ext) || 'application/octet-stream';
}

/**
 * Extracts and parses JSON content from the response text.
 * 
 * @param {string} response - The response text from the model.
 * @returns {Object} - The parsed JSON object or an empty object if parsing fails.
 */
export function extractGoogleAIJsonFromText(response) {
    if (!response) {
        console.error('Invalid input: response is missing');
        return {};
    }

    // If response is already an object, return it directly
    if (typeof response === 'object') {
        return response;
    }

    try {
        // Clean possible markdown formatting
        const cleanedText = response
            .trim()
            .replace(/^```json\s*/, '')  // Remove leading ```json
            .replace(/```$/, '');        // Remove trailing ```

        console.log("Cleaned response before parsing:", cleanedText);

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return {};
    }
};

/**
 * Cleans and formats a title string.
 * 1. Replaces consecutive spaces with a single space.
 * 2. Trims leading and trailing spaces.
 * 3. Capitalizes the first letter of every word.
 * 
 * @param {string} title - The input title string.
 * @returns {string} - The cleaned and formatted title.
 */
export const cleanTitle = (title) => {
    return title
        .toLowerCase()
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .trim() // Trim leading and trailing spaces
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
        .join(' '); // Join words back into a string
};


