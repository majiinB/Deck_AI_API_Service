/**
 * Deck API - File Repository
 *
 * @file fileRepository.js
 * @description Provides access to google cloud files.
 * 
 * This module interacts with google cloud in order to access files uploaded by users using firebase.
 * 
 * @module fileRepository
 * 
 * @requires google-cloud/storage
 * 
 * @author Arthur M. Artugue
 * @created 2025-02-15
 * @updated 2025-02-19
 * 
 */

import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Downloads a file from Google Cloud Storage to the /tmp directory.
 *
 * @async
 * @param {string} fileName - The name of the file to download.
 * @param {string} fileExtension - The file extension to append to the downloaded file.
 * @param {string} id - The unique identifier for the file.
 * @returns {Promise<string>} - The local path to the downloaded file.
 */
export async function downloadFile(fileName, fileExtension, id) {
    let filePath = '';
    try {
      const storage = new Storage();
  
      const bucketName = process.env.STORAGE_BUCKET.toString();
      const destFilename = `download-${id}${fileExtension}`;
      const tmpDir = '/tmp';
      const tmpFilePath = path.join(tmpDir, destFilename);
  
      // Ensure the /tmp directory exists
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
      }
  
      const options = { destination: tmpFilePath };
  
      await storage.bucket(bucketName).file(`uploads/${id}/${fileName}`).download(options);
      filePath = tmpFilePath;
    } catch (error) {
      console.error(`DOWNLOAD FILE ERROR: ${error}`);
      filePath = '';
    }
    return filePath;
  }

/**
 * Downloads a PDF from Google Cloud Storage.
 * @param {string} fileName - The name of the PDF file to download.
 * @param {string} id - A unique identifier used to locate the file.
 * @returns {Promise<string>} - The file path where the PDF was downloaded, or an empty string if an error occurs.
 */
export async function downloadPdf(fileName, id) {
    let filePath = '';
    try {
        console.log(process.env.KEY_FILE.toString());
        const storage = new Storage({
            keyFilename: process.env.KEY_FILE.toString(),
        });

        let bucketName = process.env.STORAGE_BUCKET.toString();
        let destFilename = `download-${id}.pdf`; // Name of the file when downloaded
        const options = {
            destination: `./downloads/${destFilename}`,
        };

        await storage.bucket(bucketName).file(`uploads/${id}/${fileName}`).download(options);
        filePath = `./downloads/${destFilename}`;
    } catch (error) {
        console.log(`DOWNLOAD PDF ERROR: ${error}`);
        return '';
    }
    return filePath;
}

/**
 * Deletes a file from the /tmp directory.
 *
 * @param {string} filename - The name of the file to delete.
 */
export function cleanupTempFile(filePath) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      } else {
        console.log(`Successfully deleted file ${filePath}`);
      }
    });
  }