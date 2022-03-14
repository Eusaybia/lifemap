const functions = require('firebase-functions');

exports.makeUppercase = functions.firestore.document('/messages/{documentId}')
    .onCreate((snap: { data: () => { (): any; new(): any; original: any; }; ref: { set: (arg0: { uppercase: any; }, arg1: { merge: boolean; }) => any; }; }, context: { params: { documentId: any; }; }) => {
      const original = snap.data().original;
      console.log('Uppercasing', context.params.documentId, original);
      const uppercase = original.toUpperCase();
      return snap.ref.set({uppercase}, {merge: true});
    });