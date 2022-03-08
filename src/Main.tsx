import React from "react";
import { QuantaStore } from "./core/QuantaStore";
import { ShenContext, Store } from "./core/Store";
import { AlphaBubble, Bubble } from "./view/Bubble";
import { Qi } from "./view/Quanta";

const Main = () => {
  const userId = "000000"
  const shenQi = "000000"

  return (
    <Qi qi={shenQi} userId={userId}/>
  );
};

export default Main;
