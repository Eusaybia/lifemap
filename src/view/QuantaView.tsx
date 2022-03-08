import React from "react";
import { stringify } from "flatted";
import { RichText } from "../core/RichText";
import { QiCorrect, Quanta, ShenT, Type } from "../core/Model";
import { Bubble } from "./Bubble";

// Lens - viewing Qi in a certain way
export type Lens =
  | "Bubble"
  | "Tabbed"
  | "Graph2D" 
  | "Graph3D" 

// Generic view used for everything
// Ideally, the lens prop should take in the actual component and discriminate between them
// But can't get the typechecking to work!
export const QuantaView = (props: { qi: Quanta }) => {
  let qi: Quanta =
    typeof props.qi === "string" ? (QiCorrect.createQi() as Quanta) : props.qi;

  const lens = qi.view

  return (
    <div>
      {() => {
        switch (lens) {
          case "Bubble": {
            return <Bubble q={qi} />;
          }
          case "Tabbed": {
            return <></>;
          }
          case "Graph2D": {
            return <></>;
          }
          case "Graph3D": {
            return <></>;
          }
          default: {
            return <></>;
          }
        }
      }}
    </div>
  );
};