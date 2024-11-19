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

// Create a single instance of the dummy provider
const DUMMY_PROVIDER = new TiptapCollabProvider({ 
  appId: 'dummyAppId', // get this at collab.tiptap.dev
  name: "dummyDocumentName", // e.g. a uuid uuidv4();
  token: "dummyToken",
  document: new QuantaClass().information 
});

const dummyQuantaStoreContext = {
  quanta: new QuantaClass(),
  provider: DUMMY_PROVIDER,  // Use the singleton instance
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
  const [jwt, setJwt] = React.useState<string>("notoken");
  const [provider, setProvider] = React.useState<TiptapCollabProvider>(dummyQuantaStoreContext.provider);

  // Immediately generate a jwt token
  React.useEffect(() => {
    const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken');
    generateAuthenticationToken()
      .then((result) => {
        const data: any = result.data;
        const token = data.token;
        setJwt(token);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  // Once the jwt token is generated, only then, create a provider
  React.useEffect(() => {
    if (jwt !== "notoken") {
      const newProvider = new TiptapCollabProvider({
        appId: appId,
        name: roomName,
        token: jwt,
        document: quanta.information,
      });
      setProvider(newProvider);

      // Clean up the provider when the component unmounts
      return () => {
        newProvider.destroy();
      };
    } 
  }, [jwt]);

  // Define a function that sends a version.preview request to the provider
  const requestVersionPreviewFromCloud = (version: Content) => {
    provider?.sendStateless(JSON.stringify({
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