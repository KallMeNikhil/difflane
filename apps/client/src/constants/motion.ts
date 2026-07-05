import type { Transition, Variants } from "framer-motion";

export const MOTION_TRANSITION: Transition = {
  duration: 0.3,
  ease: "easeOut",
};

export const FADE_IN: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: MOTION_TRANSITION },
};

export const FADE_IN_UP: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: MOTION_TRANSITION },
};

export const MODAL_IN: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: MOTION_TRANSITION },
};
