/**
 * Deck AI API
 *
 * @file index.ts
 * @description This is the main entry point for the Deck AI API. It sets up the
 * Express application.
 *
 * Routes:
 * - /prompt: Handles AI prompt-related requests.
 * - /response: Handles AI response-related requests.
 * - /hi: Handles requests that checks if the server or API is up.
 * 
 * Middleware:
 * - express.json(): Parses incoming request bodies in JSON format.
 * - errorHandler: Custom error handler middleware to log errors and return a 422 Unprocessable Entity response.
 * - CORS policy: (Cross origin resource sharing) checks if the request came from a valid source
 * - limiter: Controls the rate of request from a user (through IP)
 * 
 * Functions:
 * - errorHandler: Middleware function for error handling.
 * 
 * Server:
 * - Listens on port 3000. (Depending on env configuration)
 * 
 * To start the server, run this file. The server will listen on the specified port.
 * 
 * @module app
 * 
 * @author Arthur M. Artugue
 * @created 2024-06-10
 * @updated 2025-04-16
 */
import * as functions from "firebase-functions";
import express from "express";
import flashcardRoute from './routes/flashcardRoute.js';
import moderationRoute from './routes/moderationRoute.js'
import quizRoute from './routes/quizRoute.js'
import cors from 'cors';

/**
 * Configuration options for CORS (Cross-Origin Resource Sharing).
 *
 * This object defines the behavior for handling CORS requests, including
 * dynamically validating the origin of incoming requests.
 *
 * @property origin - A function that determines whether a given origin is allowed
 * to access the resource. It logs the origin of the request and checks it against
 * a predefined list of allowed origins. If the origin is allowed or undefined,
 * the request is permitted; otherwise, an error is returned.
 *
 * @param origin - The origin of the incoming request as a string or undefined.
 * @param callback - A callback function to signal whether the request is allowed.
 *                   It accepts an error (if any) and a boolean indicating permission.
 *
 * @example
 * // Example of an allowed origin
 * const allowedOrigins = ["https://frontend.com"];
 * // If the request comes from "https://frontend.com", it will be allowed.
 *
 * @throws {Error} If the origin is not in the list of allowed origins.
 */
const corsOptions = {
  origin: (origin, callback) => {
      console.log(`CORS Request from: ${origin}`);
      const allowedOrigins = ['https://frontend.com'];
      if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true); // Allow request
      } else {
          callback(new Error('Not allowed by CORS'));
      }
  }
};

const app = express();

// Middleware
app.use(cors(corsOptions));
// TODO: Add rate limiter
app.use(express.json());

//END POINTS
app.use('/v2/deck/generate/flashcards', flashcardRoute);
app.use('/v2/deck/moderate', moderationRoute);
app.use('/v2/deck/generate/quiz', quizRoute );


app.get('/v2/deck/hi', async (req, res) => {
    console.log('someone said hi');
    return res.status(200).json({ message: 'Hi! the server is active' });
});

export const deck_ai_api = functions.https.onRequest(app);

