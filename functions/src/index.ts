/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sign } from 'jsonwebtoken';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const appSecret = "Q3rV5UXb8C6ostOsYvzYWw8KGWjrDUWtWNHrsyinSULbOQQ1JQzwBllViSYB3oBp"


admin.initializeApp();

export const generateAuthenticationToken = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated
    //   if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to use this function.');
    //   }

    const customData = {
        // Use this list to limit the number of documents that can be accessed by this client.
        // An empty array means no access at all.
        // Not sending this property means access to all documents.
        // We are supporting a wildcard at the end of the string (only there).
    }

    // Sign the JWT with the custom claims and your secret
    const jwt = sign(customData, appSecret);

    // Return the token
    return { jwt };
});

export const helloWorld = onRequest((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});
