import React from "react";
import { AnimateSharedLayout, motion } from "framer-motion";
import { Tiptap } from "../core/Tiptap";
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import CloseIcon from '@mui/icons-material/Close';
import CircleIcon from '@mui/icons-material/Circle';

const Portal = (props: { text: string }) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const toggleIsExpanded = () => setIsExpanded(!isExpanded);
  const variants = {
    expanded: {
      width: "auto",
      height: "auto",
      transition: { duration: 0.5 },
    },
    contracted: {
      width: 100,
      height: 20,
      transition: { duration: 0.5 },
    },
  };
  return (
    <>
      <motion.div
        layout
        onClick={toggleIsExpanded}
        whileTap={{ scale: 0.97 }}
        animate={isExpanded ? "expanded" : "contracted"}
        variants={variants}
        style={{
          borderRadius: 15,
          display: "inline-block",
          border: `2px solid #777777`,
          overflow: "hidden",
          padding: 5,
        }}
      >
          testing one two three
          testing one two three
          testing one two three
          testing one two three
          testing one two three
        {/* {
          <div style={{ marginTop: -15, marginBottom: -15 }}>
            <Tiptap content={isExpanded ? props.text : props.text} />
          </div>
        } */}
      </motion.div>
    </>
  );
};

const Portal2 = (props: { text: string }) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const toggleIsExpanded = () => setIsExpanded(!isExpanded);
  return (
    <>
      <motion.div
        layout
        transition={{
          type: "spring", damping: 16
        }}
        onClick={toggleIsExpanded}
        whileTap={{ scale: 0.96 }}
        style={{
          borderRadius: 15,
          display: "inline-block",
          border: `2px solid #777777`,
          overflow: "hidden",
          width: isExpanded ? undefined : 100,
          height: isExpanded ? undefined : 20,
          padding: 4,
        }}
      >
        {
          <div style={{ marginTop: -15, marginBottom: -15 }}>
            <Tiptap content={isExpanded ? props.text : props.text} />
          </div>
        }
      </motion.div>
    </>
  );
};

export const PortalFree = (props: { children: any, id: string, hideDetail?: boolean, backgroundColor?: string, update?: () => void }) => {
  type Expansion = "Expanded" | "Preview" | "Point"
  const [expansionState, setExpansionState] = React.useState<Expansion>(
    props.hideDetail ? "Preview" : "Expanded"
  );
  const cycleExpansionState = () => {
    if (expansionState === "Expanded") setExpansionState("Preview");
    else if (expansionState === "Preview") setExpansionState("Expanded");
    else if (expansionState === "Point") setExpansionState("Preview");
  };
  const handleChildClick = (e: any) => {
    e.stopPropagation();
    cycleExpansionState();
    console.log('child');
  }

  return (
    <motion.div
      id={props.id}
      layout
      transition={{
        type: "spring",
        damping: 16,
      }}
      onUpdate={
        props.update
          ? () => {
              props.update!();
            }
          : undefined
      }
      style={{
        backgroundColor: props.backgroundColor,
        borderRadius: 15,
        display: "inline-block",
        border: `2px solid #777777`,
        overflow: "hidden",
        width: expansionState === "Expanded" ? "100%" : undefined,
        height: expansionState === "Expanded" ? "100%" : undefined,
        maxWidth:
          expansionState === "Expanded"
            ? undefined
            : expansionState === "Preview"
            ? 200
            : 100,
        maxHeight:
          expansionState === "Expanded"
            ? undefined
            : expansionState === "Preview"
            ? 50
            : 50,
        minWidth: expansionState === "Point" ? 100 : undefined,
        minHeight: expansionState === "Point" ? 50 : undefined,
        padding: 4,
      }}
    >
      <AnimateSharedLayout>
        <>
          <motion.div
            layout
            id="buttons"
            style={{
              position: "relative",
              display: "flex",
              marginTop: -10,
              marginLeft: -8,
            }}
          >
            <motion.div
              layout
              style={{
                width: 40,
                height: 40,
                scale: 0.35,
                borderRadius: "50%",
                backgroundColor: "#e53935",
                display: "grid",
                placeItems: "center",
              }}
            >
              <motion.div style={{ scale: 1.2, marginTop: 6 }}>
                <CloseIcon />
              </motion.div>
            </motion.div>
            <motion.div
              onClick={() => {
                setExpansionState("Point");
              }}
              layout
              style={{
                width: 40,
                height: 40,
                scale: 0.35,
                borderRadius: "50%",
                backgroundColor: "#ABABAB",
                display: "grid",
                placeItems: "center",
                marginLeft: -20,
              }}
            >
              <motion.div style={{ scale: 1, marginTop: 4 }}>
                <CircleIcon />
              </motion.div>
            </motion.div>
            <motion.div
              onClick={() => {
                cycleExpansionState();
              }}
              layout
              style={{
                width: 40,
                height: 40,
                scale: 0.35,
                rotate: 45,
                borderRadius: "50%",
                backgroundColor: "#ABABAB",
                display: "grid",
                placeItems: "center",
                marginLeft: -20,
              }}
            >
              <motion.div style={{ scale: 1.3, marginTop: 4 }}>
                {expansionState === "Expanded" ? (
                  <UnfoldLessIcon />
                ) : (
                  <UnfoldMoreIcon />
                )}
              </motion.div>
            </motion.div>
          </motion.div>
          {props.children}
        </>
      </AnimateSharedLayout>
    </motion.div>
  );
};



const truncate = (input: string) =>
  input.length > 5 ? `${input.substring(0, 5)}...` : input;

const PortalExample = () => {
  return (
    <AnimateSharedLayout>
      <Portal
        text={
          "The (state of) vacancy should be brought to the utmost degree, and that of stillness guarded with unwearying vigour. All things alike go through their processes of activity, and (then) we see them return (to their original state). When things (in the vegetable world) have displayed their luxuriant growth, we see each of them return to its root. This returning to their root is what we call the state of stillness; and that stillness may be called a reporting that they have fulfilled their appointed end. The report of that fulfilment is the regular, unchanging rule. To know that unchanging rule is to be intelligent; not to know it leads to wild movements and evil issues. The knowledge of that unchanging rule produces a (grand) capacity and forbearance, and that capacity and forbearance lead to a community (of feeling with all things). From this community of feeling comes a kingliness of character; and he who is king-like goes on to be heaven-like. In that likeness to heaven he possesses the Dao. Possessed of the Dao, he endures long; and to the end of his bodily life, is exempt from all danger of decay."
        }
      />
      <Portal2
        text={
          "The (state of) vacancy should be brought to the utmost degree, and that of stillness guarded with unwearying vigour. All things alike go through their processes of activity, and (then) we see them return (to their original state). When things (in the vegetable world) have displayed their luxuriant growth, we see each of them return to its root. This returning to their root is what we call the state of stillness; and that stillness may be called a reporting that they have fulfilled their appointed end. The report of that fulfilment is the regular, unchanging rule. To know that unchanging rule is to be intelligent; not to know it leads to wild movements and evil issues. The knowledge of that unchanging rule produces a (grand) capacity and forbearance, and that capacity and forbearance lead to a community (of feeling with all things). From this community of feeling comes a kingliness of character; and he who is king-like goes on to be heaven-like. In that likeness to heaven he possesses the Dao. Possessed of the Dao, he endures long; and to the end of his bodily life, is exempt from all danger of decay."
        }
      />
      {/* <PortalFree>Hello awesome world</PortalFree> */}
    </AnimateSharedLayout>
  );
};
