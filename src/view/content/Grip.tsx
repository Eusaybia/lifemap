import { motion } from "framer-motion";

export const Grip = () => {

    return (<motion.div data-drag-handle
        onMouseLeave={(event) => {
            event.currentTarget.style.cursor = "grab";
        }}
        onMouseDown={(event) => {
            event.currentTarget.style.cursor = "grabbing";
        }}
        onMouseUp={(event) => {
            event.currentTarget.style.cursor = "grab";
        }}
        style={{ position: "absolute", right: 0, top: 10, display: "flex", flexDirection: "column", cursor: "grab", fontSize: "24px", color: "grey", scale: 1.5 }}
        contentEditable="false"
        suppressContentEditableWarning={true}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}>
        ⠿
    </motion.div>)
}