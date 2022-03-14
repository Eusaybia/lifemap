import React from "react";
import { QuantaIdT, Quanta } from "../core/Model";
import { QuantaStore, QuantaStoreContent } from "../core/QuantaStore";
import { Lens, QuantaView } from "./QuantaView";

export const Qi = (props: { qi: QuantaIdT; userId: string }) => {
  return (
    <QuantaStore quantaId={props.qi} userId={props.userId}>
      <QuantaView qi={React.useContext(QuantaStoreContent)} />
    </QuantaStore>
  );
};