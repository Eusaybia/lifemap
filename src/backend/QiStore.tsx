'use client'

import React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { TiptapCollabProvider } from '@hocuspocus/provider'
import { QiC, QiId, QiT } from "../core/Model";

// Handles storing and syncing information from a single qi to the database
export const QiStoreContext = React.createContext<QiT>(new QiC());

export const QiStore = (props: { qiId: QiId, userId: string, children: JSX.Element}) => {
  // Initialise an empty yDoc to fill with data from TipTap Collab (online) and IndexedDB (offline)
  const qi = new QiC()

  // Anyone accessing this particular "room" will be able to make changes to the doc
  // The room can also be understood to be the unique id of each qi
  const roomName = props.qiId

  const appId = 'dy9wzo9x'

  // Sync the document using the cloud provider
  new TiptapCollabProvider({ 
    appId: appId,// get this at collab.tiptap.dev
    name: roomName, // e.g. a uuid uuidv4();
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTE0NTk2MDIsIm5iZiI6MTY5MTQ1OTYwMiwiZXhwIjoxNjkxNTQ2MDAyLCJpc3MiOiJodHRwczovL2NvbGxhYi50aXB0YXAuZGV2IiwiYXVkIjoia29uZ3dlaUBldXNheWJpYS5jb20ifQ.AeaTq-IkPZ5n21XAVj5lS5IfUNNsz3As25sUhkexxQY',
    document: qi.information
  });

  console.log("roomName", roomName)

  //  Sync the document locally
  new IndexeddbPersistence(roomName, qi.information)

  return (
    <QiStoreContext.Provider value={qi}>
      {props.children}
    </QiStoreContext.Provider>
  );
}