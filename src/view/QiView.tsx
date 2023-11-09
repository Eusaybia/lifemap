import React from "react";
import { QiStoreContext } from "../backend/QiStore";
import { MathsLoupeC, QiT, ShenT } from "../core/Model";
import RichText from "./content/RichText";
import { Math } from "./content/Math";
import { JSONContent } from "@tiptap/core";
import { observer } from "mobx-react-lite";

// Handles different views of a single qi
// This view is the equivalent of a single window in the app and design
export const QiView = observer((props: { qi: QiT | ShenT }) => {
  const context = React.useContext(QiStoreContext)
  let qi = context.qi

  // Create a Lens selector
  const Lens = () => {
    console.log("type", qi.informationTypeName)
    switch (qi.informationTypeName) {
      case 'jsonContent':
        return <RichText
          qi={qi}
          text={props.qi.information}
          lenses={["text"]}
          onChange={(change) => { 
            console.log(change) 
          }}
        />;
// TODO: Get rid of this since attrs handle lenses
      case 'ascii-math':
      case 'math-live-boxed-json-expression':
      case 'latex':
        const loupe = new MathsLoupeC()
        return
      default:
        throw Error("Qi does not fall into any existing informationTypes")
    }
  };

  return (
    <>
      <Lens />
    </>
  );
});