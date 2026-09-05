import React from "react";
import { QuantaStoreContext } from "../backend/QuantaStore";
import { MathsLoupeC, QuantaType, SunT } from "../core/Model";
import { observer } from "mobx-react-lite";
import RichText from "./content/RichText";

// Handles different views of a single qi
// This view is the equivalent of a single window in the app and design
export const QuantaView = observer((props: { quanta: QuantaType | SunT }) => {
  const context = React.useContext(QuantaStoreContext)
  const quanta = context.quanta

  // Keep the editor's component identity stable when its store context updates.
  switch (quanta.informationTypeName) {
    case 'jsonContent':
      return <RichText
        quanta={quanta}
        text={props.quanta.information}
        lenses={["text"]}
      />;
// TODO: Get rid of this since attrs handle lenses
    case 'ascii-math':
    case 'math-live-boxed-json-expression':
    case 'latex':
      const loupe = new MathsLoupeC()
      return
    default:
      throw Error("Quanta not fall into any existing informationTypes")
  }
});
