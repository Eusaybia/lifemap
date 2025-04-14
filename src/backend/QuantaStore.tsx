'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider } from '@hocuspocus/provider'
import { Content, QuantaClass, QuantaId, QuantaType } from "../core/Model";
import { httpsCallable } from "firebase/functions";
import { functions } from "./Firebase";
import * as Y from 'yjs'; // Import Yjs
// No longer needed: import { Awareness } from 'y-protocols/awareness'; 

type QuantaStoreContextType = {
  quanta: QuantaType,
  // Provider can be null when disabled
  provider: TiptapCollabProvider | null 
  requestVersionPreviewFromCloud: (version: Content) => void
}

// Remove the complex placeholder object
// const DUMMY_PROVIDER_PLACEHOLDER = { ... };

// Update dummy context to use null for the provider
const dummyQuantaStoreContext = {
  quanta: new QuantaClass(),
  provider: null, // Use null to represent disabled/uninitialized provider
  requestVersionPreviewFromCloud: (version: Content) => { console.warn("Provider disabled, requestVersionPreviewFromCloud ignored"); }
}

// Handles storing and syncing information between a single quanta to the remote cloud store
export const QuantaStoreContext = React.createContext<QuantaStoreContextType>(dummyQuantaStoreContext);

export const QuantaStore = (props: { quantaId: QuantaId, userId: string, children: JSX.Element}) => {
  // Initialise an empty yDoc to fill with data from TipTap Collab (online) and IndexedDB (offline)
  const quanta = new QuantaClass()

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each quanta
  const roomName = props.quantaId

  // const appId = 'dy9wzo9x' // No longer needed

  //  Sync the document locally
  // Keep local persistence active
  React.useEffect(() => {
    const persistence = new IndexeddbPersistence(roomName, quanta.information);
    // Clean up persistence on unmount
    return () => {
      persistence.destroy();
    };
  }, [roomName, quanta.information]); // Add dependencies

  // No provider state needed as it's always null in this disabled state
  // const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);

  // Remove the effect that fetches JWT
  // ... (JWT fetch code commented out)

  // Remove the effect that creates the real provider
  // ... (Provider creation code commented out)

  // Define a function that sends a version.preview request to the provider
  const requestVersionPreviewFromCloud = (version: Content) => {
    // Provider is always null in this configuration
    console.warn("Provider disabled, requestVersionPreviewFromCloud ignored");
  }

  // Context value now provides provider as null
  const quantaStoreContext = {
    quanta, 
    provider: null, // Always pass null for the provider
    requestVersionPreviewFromCloud
  }

  return (
    <QuantaStoreContext.Provider value={quantaStoreContext}>
      {props.children}
    </QuantaStoreContext.Provider>
  );
}