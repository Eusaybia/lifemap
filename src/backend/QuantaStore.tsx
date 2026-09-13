'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
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
/**
 * Fill a room's local IndexedDB copy before anyone opens it. The editor
 * renders only once the local copy has synced, and an empty local copy has
 * to wait on the cloud (about 1.6s); a warmed room opens in ~100ms. The
 * provider and persistence are torn down once the cloud has answered, and
 * IndexedDB keeps what arrived.
 */
const warmedRooms = new Set<string>();
export async function warmQuantaRoom(userId: string, quantaId: string, timeoutMs = 10_000): Promise<void> {
  const roomName = `${userId}/${quantaId}`;
  if (warmedRooms.has(roomName) || typeof window === 'undefined') return;
  warmedRooms.add(roomName);
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomName, doc);
  try {
    await persistence.whenSynced;
    if (doc.getXmlFragment('default').length > 0) return;
    const token = await getCollabToken(roomName);
    if (!token) return;
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => { provider.destroy(); resolve(); }, timeoutMs);
      const provider = new TiptapCollabProvider({
        appId: 'dy9wzo9x',
        name: roomName,
        token,
        document: doc,
        onSynced: () => { window.clearTimeout(timer); provider.destroy(); resolve(); },
      });
    });
  } catch (error) {
    warmedRooms.delete(roomName);
    console.warn('[QuantaStore] Could not warm room', roomName, error);
  } finally {
    persistence.destroy();
  }
}

/*
 * A room's local copy can start loading as soon as the page's script has
 * evaluated, before React has rendered down to the store. The store adopts
 * the preloaded document and persistence when it mounts for the same room,
 * so the IndexedDB read overlaps rendering instead of following it.
 */
type PreloadedRoom = { quanta: QuantaClass; persistence: IndexeddbPersistence; claimed: boolean };
const preloadedRooms = new Map<string, PreloadedRoom>();
export function preloadQuantaRoom(userId: string, quantaId: string): void {
  if (typeof window === 'undefined') return;
  const roomName = `${userId}/${quantaId}`;
  if (preloadedRooms.has(roomName)) return;
  performance.mark('kairos:persistence-start');
  const quanta = new QuantaClass();
  preloadedRooms.set(roomName, { quanta, persistence: new IndexeddbPersistence(roomName, quanta.information), claimed: false });
}

export const QuantaStoreContext = React.createContext<QuantaStoreContextType>(dummyQuantaStoreContext);

export const QuantaStore = (props: { quantaId: QuantaId, userId: string, children: JSX.Element}) => {
  // CRITICAL: Use useRef to keep a stable Y.Doc reference across renders
  // Without this, a new Y.Doc is created on each render but the TipTap editor
  // keeps using the old one (due to useEditor memoization), causing a disconnect
  // between what the user types and what gets persisted to IndexedDB
  const quantaRef = React.useRef<QuantaType | null>(null);
  const preloadedRef = React.useRef<PreloadedRoom | null>(null);
  
  // Create the quanta only once (or when quantaId changes); a preloaded room
  // hands over its document. Render only looks the room up: React may discard
  // this render, so the persistence is claimed in the effect below.
  if (quantaRef.current === null) {
    preloadedRef.current = preloadedRooms.get(`${props.userId}/${props.quantaId}`) ?? null;
    quantaRef.current = preloadedRef.current?.quanta ?? new QuantaClass();
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
    const preloaded = preloadedRef.current && !preloadedRef.current.claimed && preloadedRef.current.quanta === quanta ? preloadedRef.current : null;
    if (preloaded) { preloaded.claimed = true; performance.mark('kairos:persistence-adopted'); }
    else performance.mark('kairos:persistence-start');
    const persistence = preloaded?.persistence ?? new IndexeddbPersistence(roomName, quanta.information);

    const markSynced = () => {
      performance.mark('kairos:persistence-synced');
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
    
    // Clean up persistence on unmount; a claimed preload is spent with it.
    return () => {
      persistence.destroy();
      if (preloaded) preloadedRooms.delete(roomName);
    };
  }, [roomName, quanta.information]);

  // Generate a JWT Auth Token to verify the user 
  const [jwt, setJwt] = React.useState<string>("notoken");
  const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);

  // The token is minted once per page and cached (see collabToken.ts).
  React.useEffect(() => {
    let isCancelled = false;
    performance.mark('kairos:token-request');
    getCollabToken(roomName).then((token) => {
      performance.mark('kairos:token-received');
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
      
      performance.mark('kairos:provider-created');
      newProvider.on('synced', () => {
        performance.mark('kairos:provider-synced');
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
