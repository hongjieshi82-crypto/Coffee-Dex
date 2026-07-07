"use client";

import { motion, AnimatePresence } from "framer-motion";
import { loadingTexts } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";

interface LoadingOverlayProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function LoadingOverlay({ isActive, onComplete }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && <LoadingContent onComplete={onComplete} />}
    </AnimatePresence>
  );
}

function LoadingContent({ onComplete }: Pick<LoadingOverlayProps, "onComplete">) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= loadingTexts.length - 1) {
      const timeout = setTimeout(onComplete, 1200);

      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentStep, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-black/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-8">
        {/* Coffee cup animation */}
        <div className="relative">
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full border border-latte/20 bg-latte/10"
            animate={{
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Coffee className="h-12 w-12 text-latte" />
          </motion.div>

          {/* Steam particles */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute top-0 w-2 h-6 bg-latte/30 rounded-full"
              style={{ left: `${35 + i * 15}%` }}
              animate={{
                y: [-10, -40],
                opacity: [0.5, 0],
                scaleX: [1, 1.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}

          {/* Progress ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-latte/20"
            animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Loading text */}
        <div className="h-8 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-xl text-latte font-medium"
            >
              {loadingTexts[currentStep]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-latte to-neon-green rounded-full"
            animate={{ width: `${((currentStep + 1) / loadingTexts.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Fun subtext */}
        <motion.p
          className="text-xs text-white/30"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          打工人，打工魂，打工都是人上人
        </motion.p>
      </div>
    </motion.div>
  );
}
