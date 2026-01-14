import { DragGrip } from "../components/DragGrip";

/**
 * Legacy Grip component - now wraps DragGrip for backwards compatibility
 * Consider using DragGrip directly for new implementations
 */
export const Grip = () => {
    return (
        <DragGrip
            position="absolute-right"
            dotColor="#999"
            hoverBackground="rgba(0, 0, 0, 0.08)"
        />
    )
}