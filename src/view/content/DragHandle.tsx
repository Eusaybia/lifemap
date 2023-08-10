import React from 'react';
import { motion } from 'framer-motion';

interface HasDragHandle {
    DragHandle: typeof DragHandle;
}

interface DragHandleProps {
    // Add any props you want to pass to the DragHandle component here
}

const DragHandle: React.FC<DragHandleProps> = (props) => {
    return (
        <motion.div data-drag-handle
            onMouseLeave={(event) => {
                event.currentTarget.style.cursor = "grab";
            }}
            onMouseDown={(event) => {
                event.currentTarget.style.cursor = "grabbing";
            }}
            onMouseUp={(event) => {
                event.currentTarget.style.cursor = "grab";
            }}
            style={{ position: "absolute", right: -5, top: 3, display: "flex", flexDirection: "column", cursor: "grab", fontSize: "24px", color: "grey" }}
            contentEditable="false"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}>
            ⠿
        </motion.div>
    );
}

export default DragHandle;
