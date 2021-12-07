import { motion } from "framer-motion";
import React, { Children } from 'react';
import { QiZhiT } from "../core/LifeGraphModel";

export const QiZhi = (props: {energy: QiZhiT}) => {
  return (
    <motion.div
      initial={{
        boxShadow: `0px 0px 10px 20px #EFEFEF`,
      }}
      animate={{
        boxShadow: `0px 0px 30px 20px ${props.energy.colour}`,
      }}
      transition={{
        repeat: Infinity,
        duration: 4,
        repeatType: "reverse",
        repeatDelay: 1,
      }}
      style={{
        borderRadius: "50%",
        margin: `20px 0 20px 0`,
        width: 15,
        height: 15,
      }}
    />
  );
}

export const QiZhiWrapper = (props: {energy: QiZhiT, children: any}) => {
  return (
    <motion.div
      initial={{
        filter: `drop-shadow(0 0 5px #FEFEFE)`
      }}
      // animate={{
      //   boxShadow: `0px 0px 20px 10px ${props.energy.colour}`,
      // }}
      // transition={{
      //   repeat: Infinity,
      //   duration: 4,
      //   repeatType: "reverse",
      //   repeatDelay: 1,
      // }}
      style={{
      }}
    >
      {props.children}
    </motion.div>
  );
}