// /**
//  * Firebase Configuration Module
//  *
//  * @file firebaseConfig.js
//  * @description This module loads environment variables to configure Firebase services. 
//  * It exports the Firebase configuration object needed for initializing the Firebase app.
//  *
//  * External Dependencies:
//  * - dotenv: Loads environment variables from a `.env` file into `process.env`.
//  *
//  * Firebase Configuration:
//  * - Contains essential credentials such as API keys, project IDs, and storage buckets. 
//  *   These are fetched from environment variables to keep sensitive information secure.
//  *
//  * Usage:
//  * - Import this configuration object where Firebase is initialized in your project.
//  * - Ensure that the `.env` file contains all the required variables for a successful setup.
//  *
//  * @module firebaseConfig
//  * 
//  * @author Arthur M. Artugue
//  * @created 2024-06-10
//  * @updated 2024-10-26
//  */

// import * as dotenv from 'dotenv';
// import { initializeApp } from 'firebase/app';
// dotenv.config(); // Load environment variables from .env file

// // TODO: Add SDKs for Firebase products you want to use 
// // Refer: https://firebase.google.com/docs/web/setup#available-libraries

// /**
//  * Firebase configuration object.
//  * This object holds the necessary credentials for initializing the Firebase app.
//  * Each property value is sourced from environment variables for security.
//  */
// const firebaseConfig = {
//     apiKey: process.env.FIREBASE_API_KEY.toString(),  // Firebase API key
//     authDomain: process.env.AUTH_DOMAIN.toString(),   // Firebase Auth domain
//     projectId: process.env.PROJECT_ID.toString(),     // Firebase project ID
//     storageBucket: process.env.STORAGE_BUCKET.toString(),  // Storage bucket URL
//     messagingSenderId: process.env.MESSAGING_SENDER_ID.toString(),  // Messaging sender ID
//     appId: process.env.APP_ID.toString()  // Firebase app ID
// };

// const firebaseApp = initializeApp(firebaseConfig);

// export default firebaseApp; // Export configuration for use in Firebase initialization
