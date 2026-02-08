'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider } from '@tiptap-pro/provider'
import { Content, QuantaClass, QuantaId, QuantaType } from "../core/Model";
import { httpsCallable } from "firebase/functions";
import { functions } from "./Firebase";

type QuantaStoreContextType = {
  quanta: QuantaType,
  provider: TiptapCollabProvider | null
  requestVersionPreviewFromCloud: (version: Content) => void
}

// Use null for the initial context - no dummy provider that spams connection errors
const dummyQuantaStoreContext = {
  quanta: new QuantaClass(),
  provider: null,
  requestVersionPreviewFromCloud: (version: Content) => {}
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
  }
  
  const quanta = quantaRef.current;

  // ARCHITECTURE DECISION: User-scoped document naming for multi-user isolation
  // =============================================================================
  // The roomName uniquely identifies a document in TipTap Cloud and IndexedDB.
  // By prefixing with userId, each anonymous user gets their own isolated copy of
  // every document. For example, user "abc-123" editing "daily-2026-02-08" gets
  // room "abc-123/daily-2026-02-08", while user "def-456" gets "def-456/daily-2026-02-08".
  //
  // The fallback userId '000000' (from /q/[slug] when no userId query param is provided)
  // preserves backward compatibility for direct URL access during development.
  const roomName = `${props.userId}/${props.quantaId}`

  // TipTap Cloud App ID - get this at collab.tiptap.dev
  const appId = 'dy9wzo9x'

  // Sync the document locally (offline support)
  React.useEffect(() => {
    const persistence = new IndexeddbPersistence(roomName, quanta.information);
    
    // Clean up persistence on unmount
    return () => {
      persistence.destroy();
    };
  }, [roomName, quanta.information]);

  // Generate a JWT Auth Token to verify the user 
  const [jwt, setJwt] = React.useState<string>("notoken");
  const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);

  // Immediately generate a jwt token via Firebase Cloud Function
  React.useEffect(() => {
    const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken');
    generateAuthenticationToken()
      .then((result) => {
        const data: any = result.data;
        const token = data.token;
        setJwt(token);
      })
      .catch((error) => {
        console.error('[QuantaStore] Failed to generate JWT token:', error);
      });
  }, []);

  // Once the jwt token is generated, create the TiptapCollabProvider for cloud sync
  React.useEffect(() => {
    if (jwt !== "notoken") {
      const newProvider = new TiptapCollabProvider({
        appId: appId,
        name: roomName,
        token: jwt,
        document: quanta.information,
      });
      
      // Add error listener for authentication failures
      newProvider.on('authenticationFailed', (data: any) => {
        console.error(`[QuantaStore] Authentication failed for ${roomName}:`, data);
      });
      
      setProvider(newProvider);

      // Clean up the provider when the component unmounts
      return () => {
        newProvider.destroy();
      };
    } 
  }, [jwt, roomName, quanta.information, appId]);

  // Define a function that sends a version.preview request to the provider
  const requestVersionPreviewFromCloud = (version: Content) => {
    provider?.sendStateless(JSON.stringify({
      action: 'version.preview',
      version,
    }))
  }

  const quantaStoreContext = {
    quanta, 
    provider, 
    requestVersionPreviewFromCloud
  }

  return (
    <QuantaStoreContext.Provider value={quantaStoreContext}>
      {props.children}
    </QuantaStoreContext.Provider>
  );
}
