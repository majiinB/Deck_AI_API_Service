/**
 * Quiz Repository
 * 
 * @file quizRepository.js
 * @description Handles database operations related to deck retrieval.
 * 
 * This module provides functions to fetch deck data from Firestore,
 * ensuring proper validation and error handling.
 * 
 * @module quizRepository
 * 
 * @requires ../config/firebaseAdminConfig.js
 * @requires ../models/deckModel.js
 * 
 * @author Arthur M. Artugue
 * @created 2025-03-05
 * @updated 2025-03-07
 */

import { db, timeStamp } from '../config/firebaseAdminConfig.js';

/**
 * Creates a publish request document in Firestore.
 *
 * @param {string} userID - The ID of the user making the request.
 * @param {string} deckID - The ID of the deck being requested for publishing.
 * @param {object} aiVerdict - The AI moderation verdict object.
 * @returns {Promise<FirebaseFirestore.DocumentReference>} The created document reference.
 */
export async function createPublishRequest(userID, deckID, aiVerdict) {
  const newRequest = {
    user_id: userID,
    deck_id: deckID,
    requested_at: timeStamp,
    published_at: timeStamp,
    status: "FOR_APPROVAL",
    mod_verdict: "PENDING",
    ai_verdict: aiVerdict
  };

  const docRef = await db.collection("publish_requests").add(newRequest);
  return docRef;
}

/**
 * Retrieves a publish request document by deck ID.
 * 
 * @param {string} deckId - The ID of the deck to look up.
 * @returns {Promise<Object|null>} The document data if found, or null.
 */
export async function getPublishRequestByDeckId(deckId) {
  try {
    const snapshot = await db.collection("publish_requests")
      .where("deck_id", "==", deckId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No publish request found for this deck.");
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };

  } catch (error) {
    console.error("Error retrieving publish request:", error);
    throw error;
  }
}