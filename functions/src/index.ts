/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const appSecret = "Q3rV5UXb8C6ostOsYvzYWw8KGWjrDUWtWNHrsyinSULbOQQ1JQzwBllViSYB3oBp"


admin.initializeApp();

export const generateAuthenticationToken = functions.https.onCall(async (data, context) => {
    var jwt = require('jsonwebtoken');
    // Check if the user is authenticated
    //   if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to use this function.');
    //   }

    // JWT payload matching TipTap reference implementation
    // Reference: https://github.com/ueberdosis/tiptap-collab-replit
    // 
    // IMPORTANT: Omitting allowedDocumentNames allows access to ALL documents
    // https://tiptap.dev/docs/editor/collaboration/authenticate#allowing-full-access-to-every-document
    const payload = {
      // Issued at timestamp (required)
      iat: Math.floor(Date.now() / 1000),
      // Subject claim (user identifier) - optional but recommended
      sub: 'lifemap-user',
    };

    // Sign the JWT with HS256 algorithm (required by TipTap Cloud)
    const token = jwt.sign(payload, appSecret, { algorithm: 'HS256' });

    // Return the token
    return { token };
});

// helloWorld test function removed to avoid Gen 1/Gen 2 deployment conflicts
