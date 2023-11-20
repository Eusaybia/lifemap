'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider } from '@hocuspocus/provider'
import { Content, QuantaClass, QuantaId, QuantaType } from "../core/Model";
import { httpsCallable } from "firebase/functions";
import { functions } from "./Firebase";

type QuantaStoreContextType = {
  quanta: QuantaType,
  provider: TiptapCollabProvider
  requestVersionPreviewFromCloud: (version: Content) => void
}
const dummyQuantaStoreContext = {
  quanta: new QuantaClass(),
  provider: new TiptapCollabProvider({ 
    appId: 'zxcb123',// get this at collab.tiptap.dev
    name: "example", // e.g. a uuid uuidv4();
    token: "",
    document: new QuantaClass().information 
  }),
  requestVersionPreviewFromCloud: (version: Content) => {}
}

// Handles storing and syncing information between a single quanta to the remote cloud store
export const QuantaStoreContext = React.createContext<QuantaStoreContextType>(dummyQuantaStoreContext);

export const QuantaStore = (props: { quantaId: QuantaId, userId: string, children: JSX.Element}) => {
  // Initialise an empty yDoc to fill with data from TipTap Collab (online) and IndexedDB (offline)
  const quanta = new QuantaClass()

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each quanta
  const roomName = props.quantaId

  const appId = 'dy9wzo9x'

  //  Sync the document locally
  new IndexeddbPersistence(roomName, quanta.information)

  // Generate a JWT Auth Token to verify the user 
  let jwt = ""
  const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken');
  generateAuthenticationToken().then((result) => {
    // Read result of the Cloud Function.
    console.log("result", result)
    const data: any = result.data;
    jwt = data.token;
    console.log("jwt", jwt)
  }).catch((error) => {
    console.error(error)
  });

  // Sync the document using the cloud provider
  const provider = new TiptapCollabProvider({ 
    appId: appId,// get this at collab.tiptap.dev
    name: roomName, // e.g. a uuid uuidv4();
    token: jwt,
    document: quanta.information
  });

  // Define a function that sends a version.preview request to the provider
  const requestVersionPreviewFromCloud = (version: Content) => {
    provider.sendStateless(JSON.stringify({
      action: 'version.preview',
      // Include your version number here
      version,
    }))
  }

  const quantaStoreContext = {
    quanta, provider, requestVersionPreviewFromCloud
  }

  return (
    <QuantaStoreContext.Provider value={quantaStoreContext}>
      {props.children}
    </QuantaStoreContext.Provider>
  );
}