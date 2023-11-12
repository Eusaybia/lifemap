import React from "react";
import { QuantaId, Loupe, MathsLoupeC } from "./Model";
import { QuantaStore, QuantaStoreContext } from "../backend/QuantaStore";
import { QuantaView } from "../view/QuantaView";
import NoSSR from "../utils/NoSSR";

export const Quanta = (props: { quantaId: QuantaId; userId: string, loupe?: Loupe }) => {
  return (
    // This store is not visual, it is purely to feed information
    // @ts-ignore
    <NoSSR>
      <QuantaStore quantaId={props.quantaId} userId={props.userId}>
        {/* Use the qi in QiStore 
      This seemingly gets the wrong qi, the default value, rather than
      the store provided one
      */}
        <QuantaView quanta={React.useContext(QuantaStoreContext).quanta} />
      </QuantaStore>
    </NoSSR>
  );
};

export const QuantaExample = () => (
  <Quanta quantaId={'000000'} userId={'000000'} loupe={new MathsLoupeC()}/>
)
