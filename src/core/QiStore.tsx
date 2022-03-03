import {  autorun, comparer, isObservable, observable, reaction, runInAction, toJS } from 'mobx';
import React from 'react'
import { DefaultQi, ExampleShen, GraphCorrect, QiCorrect, QiIdT, QiT } from "./Model";
import { stringify, parse } from "flatted";
import { db } from '../backend/Database';
import { Content } from '@tiptap/react';
import { useLocalObservable } from 'mobx-react-lite';

export const QiStoreContext = React.createContext<QiT>(DefaultQi());

export const QiStore = (props: {
  qiId: QiIdT;
  userId: string;
  children: any;
}) => {
  // Create a single qi, which represents the local state of this store
  let qi: QiT = React.useContext(QiStoreContext);

  // Subscribe to one qi
  // The fields information, relationsFrom and causalRelationsFrom will automatically update from the server
  const qiRef = db.collection(`${props.userId}/qi/`).doc(`${props.qiId}`);
  const unsubscribeQi = qiRef.onSnapshot((doc) => {
    if (doc.exists) {
      const serverQi = doc.data();
      // Compare the retrieved qi with the qi in local state
      if (serverQi && !comparer.structural(serverQi, qi)) {
        // Update the local state qi
        runInAction(() => {
          // TODO: Should have a withConverter
          qi = observable(serverQi) as QiT;
        });
      }
    } else {
      // Do nothing, qi is already initialised using DefaultQi
    }
  });

  // Create reactions
  const disposeInformationReaction = reaction(
    () => qi.information,
    // If the information changes, then run
    (information) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      qiRef.set(
        { information: qi.information },
        { mergeFields: ["information"] }
      );
      // It's really no problem to not use computed, since computed only works locally,
      // but we've chosen to maintain the updated values on the db as well 
      runInAction(() => {
        // Check for the presence of other Qi in the Content and extract relationsTo, and causalRelationsTo
        // TODO: Implement this function
        const parseContent = (information: Content, type: "relations") => []
        qi.relationsTo = parseContent(information, "relations")
        // For all relationsTo, update the relationsFrom of the To qi
        // qi.energy = computeEnergy(qi.relations, qi.causalRelationsFrom)
        // For all causalRelationsTo, update the relationsFrom of the To qi
        // qi.causalRelationsTo = parseContent(information, "causalRelations")
      })
    }
  )
  const disposeRelationsToReaction = reaction(
    () => qi.relationsTo,
    // If the information changes, then run
    (relationsTo) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      qiRef.set(
        { relationsTo: relationsTo },
        { mergeFields: ["relationsTo"] }
      );
    }
  )

  const disposeEnergyReaction = reaction(
    () => qi.energy,
    // If the information changes, then run
    (energy) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      qiRef.set(
        { energy: energy },
        { mergeFields: ["energy"] }
      );
    }
  )

  const disposeCausalRelationsToReaction = reaction(
    () => qi.causalRelationsTo,
    // If the information changes, then run
    (causalRelationsTo) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      qiRef.set(
        { causalRelationsTo: causalRelationsTo },
        { mergeFields: ["causalRelationsTo"] }
      );
    }
  )

  React.useEffect(() => {
    // Clean up
    disposeInformationReaction()
    disposeRelationsToReaction()
    disposeEnergyReaction()
    disposeCausalRelationsToReaction()
    unsubscribeQi();
  });

  return (
    <QiStoreContext.Provider value={qi}>
      {props.children}
    </QiStoreContext.Provider>
  );
};