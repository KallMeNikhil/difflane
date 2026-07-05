import type { Transition, Variants } from "framer-motion";

export const MOTION_TRANSITION: Transition = {
  duration: 0.3,
  ease: "easeOut",
};

export const MODAL_IN: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: MOTION_TRANSITION },
};
