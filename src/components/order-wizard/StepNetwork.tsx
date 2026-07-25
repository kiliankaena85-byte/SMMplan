import React from "react";
import { motion } from "framer-motion";
import { PublicNetwork } from "@/actions/order/catalog";
import { slideVariants } from "./animations";

interface StepNetworkProps {
  direction: number;
  catalog: PublicNetwork[];
  selectNetwork: (network: PublicNetwork) => void;
}

export function StepNetwork({ direction, catalog, selectNetwork }: StepNetworkProps) {
  return (
    <motion.div
      key="step-network"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl"
    >
      <motion.div 
        layoutId="network-grid"
        className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 md:p-6 w-full mx-auto"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6 text-center tracking-tight">Выберите соцсеть</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          {catalog.map(network => (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              key={network.id}
              onClick={() => selectNetwork(network)}
              className="aspect-square bg-card hover:bg-accent border border-border rounded-xl flex flex-col items-center justify-center gap-2 sm:gap-3 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden"
            >
              <img src={network.icon} alt={network.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <span className="font-bold text-foreground text-xs sm:text-sm">{network.name}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
