import {  autorun, comparer, IReactionDisposer, isObservable, observable, reaction, runInAction, toJS } from 'mobx';
import React from 'react'
import { DefaultQi, ExampleShen, GraphCorrect, QiCorrect, QuantaIdT, Quanta, ShenT } from "./Model";
import { stringify, parse } from "flatted";
import { db } from '../backend/Database';
import { Content } from '@tiptap/react';
import { useLocalObservable } from 'mobx-react-lite';
import { QuantaView } from '../view/QuantaView';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const QuantaStoreContent = React.createContext<Quanta>(DefaultQi());

export const QuantaStore = (props: {
  quantaId: QuantaIdT;
  userId: string;
  // Should take (props: { quanta: QuantaT }) => Element but the type checking doesn't allow it
  children: any
}) => {
  // Create a single quanta, which represents the local state of this store
  let quanta: Quanta | ShenT = React.useContext(QuantaStoreContent);
  console.log(props.quantaId)
  const quantaRef = doc(db, "quanta", props.quantaId)

  // Subscribe to one quanta or one 神
  // The fields information, relationsFrom and causalRelationsFrom will automatically update from the server
  const unsubQuanta = onSnapshot(quantaRef, (doc) => {
    console.log("Current data: ", doc.data());
    const serverQuanta = doc.data();
    // Compare the retrieved quanta with the quanta in local state
    if (serverQuanta && !comparer.structural(serverQuanta, quanta)) {
      // Update the local state quanta
      runInAction(() => {
        // TODO: Should have a withConverter
        if (serverQuanta.type === "Qi") {
          quanta = observable(serverQuanta) as Quanta;
        } else if (serverQuanta.type === "Shen") {
          quanta = observable(serverQuanta) as ShenT;
        }
      });
    }
  });

  // Create reactions
  let reactionDisposers: IReactionDisposer[] = []
  const disposeInformationReaction = reaction(
    () => quanta.information,
    // If the information changes, then run
    (information) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      setDoc(quantaRef, { information: quanta.information }, { mergeFields: ["information"] })
      // It's really no problem to not use computed, since computed only works locally,
      // but we've chosen to maintain the updated values on the db as well
      runInAction(() => {
        // Check for the presence of other Qi in the Content and extract relationsTo, and causalRelationsTo
        // TODO: Implement this function
        const parseContent = (information: Content, type: "relations") => [];
        quanta.relationsTo = parseContent(information, "relations");
        // For all relationsTo, update the relationsFrom of the To qi
        // qi.energy = computeEnergy(qi.relations, qi.causalRelationsFrom)
        // For all causalRelationsTo, update the relationsFrom of the To qi
        // qi.causalRelationsTo = parseContent(information, "causalRelations")
      });
    }
  );
  reactionDisposers.push(disposeInformationReaction)

  const disposeRelationsToReaction = reaction(
    () => quanta.relationsTo,
    // If the information changes, then run
    (relationsTo) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      setDoc(quantaRef, { relationsTo: relationsTo }, { mergeFields: ["relationsTo"] });
    }
  );
  reactionDisposers.push(disposeRelationsToReaction)

  const disposeEnergyReaction = reaction(
    () => quanta.energy,
    // If the information changes, then run
    (energy) => {
      // The RichText component will mutate qi.content, but this needs to be pushed to db
      setDoc(quantaRef, { energy: energy }, { mergeFields: ["energy"] });
    }
  );
  reactionDisposers.push(disposeEnergyReaction)

  if (quanta.causalRelationsTo !== undefined) {
    const disposeCausalRelationsToReaction = reaction(
      // @ts-ignore - Despite the type guard, compiler thinks that causalRelations doesn't exist
      () => quanta.causalRelationsTo,
      // If the information changes, then run
      (causalRelationsTo) => {
        // The RichText component will mutate qi.content, but this needs to be pushed to db
        setDoc(
          quantaRef,
          { causalRelationsTo: causalRelationsTo },
          { mergeFields: ["causalRelationsTo"] }
        );
      }
    );
    reactionDisposers.push(disposeCausalRelationsToReaction)
  }

  React.useEffect(() => {
    // Clean up
    reactionDisposers.map((reactionDisposer) => reactionDisposer());
    unsubQuanta()
  });

  return (
    <QuantaStoreContent.Provider value={quanta}>
      {props.children}
    </QuantaStoreContent.Provider>
  );
};