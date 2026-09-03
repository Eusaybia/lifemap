'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider } from '@tiptap-pro/provider'
import { Content, QuantaClass, QuantaId, QuantaType } from "../core/Model";
import { getCollabToken } from "./collabToken";

type QuantaStoreContextType = {
  quantaId: QuantaId,
  quanta: QuantaType,
  provider: TiptapCollabProvider | null
  isLocalFirst?: boolean
  requestVersionPreviewFromCloud: (version: Content) => void
}

// Use null for the initial context - no dummy provider that spams connection errors
const dummyQuantaStoreContext = {
  quantaId: '',
  quanta: new QuantaClass(),
  provider: null,
  isLocalFirst: false,
  requestVersionPreviewFromCloud: (version: Content) => {}
}

/** How long an empty local document waits for the cloud before the editor opens anyway. */
const EMPTY_DOCUMENT_GRACE_MS = 5000;

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

  /*
   * The editor must not exist before the document has arrived. Created over
   * an empty Y.Doc, it writes its default empty paragraph into the shared
   * document, and when the stored content then merges in, that paragraph
   * survives as a blank line; every open added another. So the children
   * (the editor) render only once IndexedDB has synced, and, if that left the
   * document empty, once the cloud has answered too, or after a grace period
   * for a note that is genuinely new or a device that is offline.
   */
  const [localSynced, setLocalSynced] = React.useState(false);
  const [cloudSynced, setCloudSynced] = React.useState(false);
  const [gracePeriodOver, setGracePeriodOver] = React.useState(false);

  // Sync the document locally (offline support)
  React.useEffect(() => {
    setLocalSynced(false);
    setCloudSynced(false);
    setGracePeriodOver(false);
    const persistence = new IndexeddbPersistence(roomName, quanta.information);

    const markSynced = () => {
      setLocalSynced(true);
      if (typeof window === 'undefined') return;
      (window as any).__KAIROS_IOS_LOCAL_PERSISTENCE_SYNCED__ = {
        ...((window as any).__KAIROS_IOS_LOCAL_PERSISTENCE_SYNCED__ || {}),
        [roomName]: true,
      };
      window.dispatchEvent(new CustomEvent('kairos-ios-local-persistence-synced', {
        detail: { roomName },
      }));
    };

    if ('whenSynced' in persistence && persistence.whenSynced instanceof Promise) {
      persistence.whenSynced.then(markSynced).catch(markSynced);
    } else {
      persistence.once('synced', markSynced);
    }
    
    // Clean up persistence on unmount
    return () => {
      persistence.destroy();
    };
  }, [roomName, quanta.information]);

  // Generate a JWT Auth Token to verify the user 
  const [jwt, setJwt] = React.useState<string>("notoken");
  const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);

  // The token is minted once per page and cached (see collabToken.ts).
  React.useEffect(() => {
    let isCancelled = false;
    getCollabToken(roomName).then((token) => {
      if (!isCancelled && token) setJwt(token);
    });
    return () => {
      isCancelled = true;
    };
  }, [roomName]);

  // Once the jwt token is generated, create the TiptapCollabProvider for cloud sync
  React.useEffect(() => {
    if (jwt !== "notoken") {
      const newProvider = new TiptapCollabProvider({
        appId: appId,
        name: roomName,
        token: jwt,
        document: quanta.information,
      });
      
      newProvider.on('synced', () => {
        setCloudSynced(true);
        window.dispatchEvent(new CustomEvent('kairos-cloud-synced', { detail: { roomName } }));
      });

      // Add error listener for authentication failures
      newProvider.on('authenticationFailed', (data: any) => {
        console.warn(`[QuantaStore] Authentication failed for ${roomName}. Running without cloud sync.`, data);
      });
      
      setProvider(newProvider);

      // Clean up the provider when the component unmounts
      return () => {
        newProvider.destroy();
      };
    } 
  }, [jwt, roomName, quanta.information, appId]);

  React.useEffect(() => {
    if (!localSynced) return;
    const timer = window.setTimeout(() => setGracePeriodOver(true), EMPTY_DOCUMENT_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [localSynced, roomName]);

  const hasLocalContent = localSynced && quanta.information.getXmlFragment('default').length > 0;
  const documentReady = localSynced && (hasLocalContent || cloudSynced || gracePeriodOver);

  // Define a function that sends a version.preview request to the provider
  const requestVersionPreviewFromCloud = (version: Content) => {
    provider?.sendStateless(JSON.stringify({
      action: 'version.preview',
      version,
    }))
  }

  const quantaStoreContext = {
    quantaId: props.quantaId,
    quanta, 
    provider, 
    isLocalFirst: false,
    requestVersionPreviewFromCloud
  }

  return (
    <QuantaStoreContext.Provider value={quantaStoreContext}>
      {documentReady ? props.children : null}
    </QuantaStoreContext.Provider>
  );
}
