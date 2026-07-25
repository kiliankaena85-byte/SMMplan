import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { PublicCategory, PublicNetwork } from "@/actions/order/catalog";
import { slideVariants } from "./animations";

interface StepCategoryProps {
  direction: number;
  selectedNetwork: PublicNetwork;
  selectCategory: (cat: PublicCategory) => void;
}

export function StepCategory({ direction, selectedNetwork, selectCategory }: StepCategoryProps) {
  return (
    <motion.div
      key="step-category"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl"
    >
      <motion.div 
        layoutId={`network-card-${selectedNetwork.id}`}
        className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 md:p-6 w-full mx-auto"
      >
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <img src={selectedNetwork.icon} alt={selectedNetwork.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{selectedNetwork.name}</h2>
        </div>
        
        <div className="flex flex-col gap-2 sm:gap-3">
          {selectedNetwork.categories.map((category, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={category.id}
              onClick={() => selectCategory(category)}
              className="flex items-center justify-between p-3 sm:p-4 bg-card hover:bg-accent border rounded-xl cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-sm sm:text-base mb-1">{category.name}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
