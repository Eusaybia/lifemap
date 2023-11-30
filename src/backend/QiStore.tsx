'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider, TiptapCollabProviderConfiguration } from '@hocuspocus/provider'
import { QiC, QiId, QiT } from "../core/Model";
import { httpsCallable } from "firebase/functions";
import { functions } from "./Firebase";

type QiStoreContextType = {
  qi: QiT,
  provider?: TiptapCollabProvider
}
const dummyQiStoreContext = {
  qi: new QiC(),
  provider: undefined
}

// Handles storing and syncing information from a single qi to the database
export const QiStoreContext = React.createContext<QiStoreContextType>(dummyQiStoreContext);

export const QiStore = (props: { qiId: QiId, userId: string, children: JSX.Element}) => {

   // Generate a JWT Auth Token to verify the user 
   const [jwt, setJwt] = React.useState("")
 
   // Sync the document using the cloud provider
   const [provider, setProvider] = React.useState<TiptapCollabProvider | undefined>(undefined);

  // Initialise an empty yDoc to fill with data from TipTap Collab (online) and IndexedDB (offline)
  const qi = new QiC()

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each qi
  const roomName = props.qiId

  const appId = 'dy9wzo9x'

  //  Sync the document locally
  new IndexeddbPersistence(roomName, qi.information)

  console.log("roomName", roomName)

  // Connect to TipTap Cloud on load, once
  React.useEffect(() => {
    const fetchData = async () => {
      // Generate a JWT Auth Token to verify the user 
      const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken');
      try {
        const result = await generateAuthenticationToken();
        // Read result of the Cloud Function.
        console.log("result", result)
        const data: any = result.data;
        setJwt(data.token);
        console.log("jwt", data.token)

        const providerConfiguration: TiptapCollabProviderConfiguration = {
          appId: appId,// get this at collab.tiptap.dev
          name: roomName, // e.g. a uuid uuidv4();
          token: data.token,
          document: qi.information
        }
        console.log("provider config", providerConfiguration)

        const provider = new TiptapCollabProvider(providerConfiguration)

        setProvider(provider);
      } catch (error) {
        console.error(error)
      }
    };

    fetchData();
  }, []);

  return (
    <QiStoreContext.Provider value={{ qi, provider }}>
      {props.children}
    </QiStoreContext.Provider>
  );
}