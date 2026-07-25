export const slideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    position: "absolute" as const,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
    scale: 1,
    position: "relative" as const,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    position: "absolute" as const,
  })
};

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};
