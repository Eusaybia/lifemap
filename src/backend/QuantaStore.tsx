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
    console.log(`[QuantaStore] Created new QuantaClass for ${props.quantaId}`);
  }
  
  const quanta = quantaRef.current;

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each quanta
  const roomName = props.quantaId

  // TipTap Cloud App ID - get this at collab.tiptap.dev
  const appId = 'dy9wzo9x'

  // Sync the document locally (offline support)
  React.useEffect(() => {
    console.log(`[QuantaStore PERF] Creating IndexeddbPersistence for ${roomName}...`)
    const perfStart = performance.now()
    const persistence = new IndexeddbPersistence(roomName, quanta.information);
    console.log(`[QuantaStore PERF] IndexeddbPersistence created for ${roomName} in ${(performance.now() - perfStart).toFixed(0)}ms`)
    
    persistence.on('synced', () => {
      console.log(`[QuantaStore PERF] ${roomName} synced locally in ${(performance.now() - perfStart).toFixed(0)}ms from creation`)
    })
    
    // Clean up persistence on unmount
    return () => {
      console.log(`[QuantaStore PERF] Destroying IndexeddbPersistence for ${roomName}`)
      persistence.destroy();
    };
  }, [roomName, quanta.information]);

  // Generate a JWT Auth Token to verify the user 
  const [jwt, setJwt] = React.useState<string>("notoken");
  const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);

  // Immediately generate a jwt token via Firebase Cloud Function
  React.useEffect(() => {
    console.log(`[QuantaStore] Attempting to fetch JWT token from Firebase...`);
    const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken');
    generateAuthenticationToken()
      .then((result) => {
        const data: any = result.data;
        const token = data.token;
        console.log(`[QuantaStore] ✅ JWT token received for cloud sync (token length: ${token?.length})`);
        // Try to decode JWT to see its contents (won't verify signature, just parse)
        try {
          const parts = token?.split('.');
          if (parts?.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log(`[QuantaStore] JWT payload:`, payload);
            if (payload.exp) {
              console.log(`[QuantaStore] JWT expires: ${new Date(payload.exp * 1000).toISOString()}`);
            }
          }
        } catch (e) {
          console.log(`[QuantaStore] Could not parse JWT payload`);
        }
        setJwt(token);
      })
      .catch((error) => {
        console.error('[QuantaStore] ❌ Failed to generate JWT token:', error);
        console.error('[QuantaStore] This means cloud sync will NOT work. Check if Firebase function is deployed.');
      });
  }, []);

  // Once the jwt token is generated, create the TiptapCollabProvider for cloud sync
  React.useEffect(() => {
    if (jwt !== "notoken") {
      console.log(`[QuantaStore] Creating TiptapCollabProvider for ${roomName} with cloud sync...`);
      console.log(`[QuantaStore] AppId: ${appId}, Room: ${roomName}`);
      
      const newProvider = new TiptapCollabProvider({
        appId: appId,
        name: roomName,
        token: jwt,
        document: quanta.information,
      });
      
      // Add comprehensive connection status listeners
      newProvider.on('connect', () => {
        console.log(`[QuantaStore] ✅ Connected to TipTap Cloud for ${roomName}`);
      });
      
      newProvider.on('disconnect', () => {
        console.log(`[QuantaStore] ⚠️ Disconnected from TipTap Cloud for ${roomName}`);
      });
      
      // The synced event fires when initial sync completes
      newProvider.on('synced', (data: any) => {
        console.log(`[QuantaStore] 🔄 SYNCED event for ${roomName}:`, data);
        console.log(`[QuantaStore] Y.Doc state after sync: ${quanta.information.toJSON ? JSON.stringify(quanta.information.toJSON()).substring(0, 200) : 'no toJSON'}`);
      });
      
      newProvider.on('status', ({ status }: { status: string }) => {
        console.log(`[QuantaStore] 📡 Provider status for ${roomName}: ${status}`);
      });
      
      // Add error listener
      newProvider.on('authenticationFailed', (data: any) => {
        console.error(`[QuantaStore] ❌ Authentication FAILED for ${roomName}:`, data);
      });
      
      // Add message listener for debugging
      newProvider.on('message', (data: any) => {
        console.log(`[QuantaStore] 📨 Message received for ${roomName}:`, data?.type || 'unknown type');
      });
      
      // Log initial provider state
      console.log(`[QuantaStore] Provider created. isSynced: ${newProvider.isSynced}, isConnected: ${newProvider.isConnected}`);
      
      setProvider(newProvider);

      // Clean up the provider when the component unmounts
      return () => {
        console.log(`[QuantaStore] Destroying TiptapCollabProvider for ${roomName}`);
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