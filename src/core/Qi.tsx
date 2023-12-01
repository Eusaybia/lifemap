'use client'

import React from "react";
import { QiId, Loupe, MathsLoupeC } from "../core/Model";
import { QiStore, QiStoreContext } from "../backend/QiStore";
import { QiView } from "../view/QiView";

export const Qi = (props: { qiId: QiId; userId: string, loupe?: Loupe }) => {
  const context = React.useContext(QiStoreContext)
  let qi = context.qi

  return (
    <QiStore qiId={props.qiId} userId={props.userId}>
      {/* Use the qi in QiStore 
      This seemingly gets the wrong qi, the default value, rather than
      the store provided one
      */}
      <QiView qi={qi} />
    </QiStore>
  );
};

export const QiExample = () => (
  <Qi qiId={'000000'} userId={'000000'} loupe={new MathsLoupeC()}/>
)
