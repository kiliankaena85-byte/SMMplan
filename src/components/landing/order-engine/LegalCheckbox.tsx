"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface LegalCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  labelClassName?: string;
}

export function LegalCheckbox({
  id,
  checked,
  onChange,
  className = "",
  labelClassName = "",
}: LegalCheckboxProps) {
  return (
    <label
      className={`flex items-start gap-2.5 cursor-pointer py-1.5 min-h-[44px] select-none group ${className}`}
    >
      {/* Native hidden input overlayed on custom styled animated checkbox */}
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 focus:outline-none"
        />
        <motion.div
          animate={{
            scale: checked ? 1.05 : 1,
            borderColor: checked ? "var(--color-primary)" : "var(--color-border)",
            backgroundColor: checked ? "var(--color-primary)" : "rgba(3, 105, 161, 0)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm group-hover:border-primary/70`}
          style={{
            borderColor: checked ? "var(--color-primary)" : "var(--color-border)",
          }}
        >
          <AnimatePresence initial={false}>
            {checked && (
              <motion.svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
              >
                <path
                  d="M1.5 5L4.5 8L10.5 2"
                  stroke="var(--color-primary-foreground)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <span className={`text-[10px] leading-tight text-left text-foreground/80 font-bold select-none ${labelClassName}`}>
        Я согласен с{" "}
        <Link
          href={ROUTES.LEGAL.TERMS}
          target="_blank"
          className="underline text-primary hover:text-primary-600 transition-colors font-extrabold"
          onClick={(e) => e.stopPropagation()}
        >
          Офертой
        </Link>{" "}
        и{" "}
        <Link
          href={ROUTES.LEGAL.PRIVACY}
          target="_blank"
          className="underline text-primary hover:text-primary-600 transition-colors font-extrabold"
          onClick={(e) => e.stopPropagation()}
        >
          Политикой конфиденциальности
        </Link>
      </span>
    </label>
  );
}
