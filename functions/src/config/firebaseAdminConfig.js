/**
 * Deck - Firebase Admin Configuration
 *
 * @file firebaseAdminConfig.js
 * @description This module initializes Firebase Admin SDK using a service account 
 * and provides middleware for verifying Firebase authentication tokens in API requests.
 *
 * Initialization:
 * - Reads service account credentials from an environment-specified JSON file.
 * - Configures Firebase Admin SDK with the credentials to enable authentication services.
 *
 * Middleware:
 * - verifyFirebaseToken: Middleware that verifies Firebase ID tokens sent in Authorization headers.
 *   - If valid, attaches the decoded user data to `req.user` and allows the request to proceed.
 *   - If invalid or missing, returns an unauthorized error response.
 *
 * External Dependencies:
 * - firebase-admin: Firebase Admin SDK for server-side authentication.
 * - dotenv: Loads environment variables from a `.env` file.
 * - fs: Reads the service account JSON file.
 *
 * Environment Variables:
 * - KEY_FILE: Path to the Firebase service account JSON file.
 *
 * @module firebaseAdminConfig
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-20
 * @updated 2025-02-20
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs'

dotenv.config();

admin.initializeApp();

export const db = admin.firestore();
export const timeStamp = admin.firestore.Timestamp.now();

/**
 * Middleware to verify Firebase ID token from the request's Authorization header.
 *
 * @function verifyFirebaseToken
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {void} Calls `next()` if authentication succeeds, otherwise sends a 401 or 403 error response.
 */
export const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;  // Attach user data to request
        next(); // Proceed to the next middleware
    } catch (error) {
        return res.status(403).json({ error: "Unauthorized: Invalid token: " + error });
    }
};


