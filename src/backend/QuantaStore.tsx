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
  // CRITICAL: Use useRef to keep a stable Y.Doc reference across renders
  // Without this, a new Y.Doc is created on each render but the TipTap editor
  // keeps using the old one (due to useEditor memoization), causing a disconnect
  // between what the user types and what gets persisted to IndexedDB
  const quantaRef = React.useRef<QuantaType | null>(null);
  
  // Create the quanta only once (or when quantaId changes)
  if (quantaRef.current === null) {
    quantaRef.current = new QuantaClass();
    console.log(`[QuantaStore] Created new QuantaClass for ${props.quantaId}`);
  }
  
  const quanta = quantaRef.current;

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each quanta
  const roomName = props.quantaId

  // const appId = 'dy9wzo9x' // No longer needed

  //  Sync the document locally
  // Keep local persistence active
  React.useEffect(() => {
    console.log(`[QuantaStore PERF] Creating IndexeddbPersistence for ${roomName}...`)
    const perfStart = performance.now()
    const persistence = new IndexeddbPersistence(roomName, quanta.information);
    console.log(`[QuantaStore PERF] IndexeddbPersistence created for ${roomName} in ${(performance.now() - perfStart).toFixed(0)}ms`)
    
    persistence.on('synced', () => {
      console.log(`[QuantaStore PERF] ${roomName} synced in ${(performance.now() - perfStart).toFixed(0)}ms from creation`)
    })
    
    // Clean up persistence on unmount
    return () => {
      console.log(`[QuantaStore PERF] Destroying IndexeddbPersistence for ${roomName}`)
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