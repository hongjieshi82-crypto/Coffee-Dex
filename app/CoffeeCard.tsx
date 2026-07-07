"use client";

import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import { CoffeeItem } from "@/lib/mock-data";

interface CoffeeCardProps {
  coffee: CoffeeItem;
  index: number;
  isUnlocking: boolean;
}

export default function CoffeeCard({ coffee, index, isUnlocking }: CoffeeCardProps) {
  const delay = index * 0.05;

  if (isUnlocking) {
    return (
      <motion.div
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [0.8, 1.15, 1],
          opacity: 1,
          rotateY: [0, 180, 360],
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="relative group"
      >
        {/* Unlock flash effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-neon-green/20 blur-xl z-10"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, times: [0, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-0 rounded-2xl bg-latte/30 blur-lg z-10"
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 1, delay: 0.2, times: [0, 0.4, 1] }}
        />

        {/* Card content */}
        <div className="glass-card-unlocked rounded-2xl overflow-hidden relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${coffee.gradient} opacity-30`} />
          <div className="relative p-5 flex flex-col h-full min-h-[280px]">
            {/* Unlock badge */}
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="absolute top-3 right-3 z-20"
            >
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-neon-green/20 text-neon-green border border-neon-green/30">
                新解锁
              </span>
            </motion.div>

            {/* Coffee image area */}
            <div className="flex-1 flex items-center justify-center mb-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl border border-latte/20 bg-latte/10"
              >
                <Coffee className="h-10 w-10 text-latte" />
              </motion.div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold text-latte">{coffee.name}</h3>
                <span className="text-xs text-white/40">{coffee.nameEn}</span>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-sm text-white/60 leading-relaxed"
                style={{ fontFamily: "'Caveat', cursive", fontSize: "15px" }}
              >
                {coffee.aiComment}
              </motion.p>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-latte/50">
                  {coffee.unlockDate}
                </span>
                <span className="text-xs text-neon-green">
                  ×{coffee.unlockCount} 杯
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (coffee.unlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="group"
      >
        <div className="glass-card-unlocked rounded-2xl overflow-hidden h-full relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${coffee.gradient} opacity-20 rounded-2xl`} />
          <div className="relative p-5 flex flex-col h-full min-h-[280px]">
            {/* Coffee image area */}
            <div className="flex-1 flex items-center justify-center mb-3 relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-latte/20 bg-latte/10 opacity-80 transition-opacity group-hover:opacity-100">
                <Coffee className="h-8 w-8 text-latte" />
              </div>
              {/* Steam effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-1">
                <motion.div
                  className="w-0.5 h-4 bg-white/20 rounded-full"
                  animate={{ y: [-2, -10], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="w-0.5 h-3 bg-white/15 rounded-full"
                  animate={{ y: [-2, -8], opacity: [0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold text-latte">{coffee.name}</h3>
                <span className="text-xs text-white/40">{coffee.nameEn}</span>
              </div>
              <p
                className="text-sm text-white/60 leading-relaxed line-clamp-3"
                style={{ fontFamily: "'Caveat', cursive", fontSize: "15px" }}
              >
                {coffee.aiComment}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-latte/50">
                  {coffee.unlockDate}
                </span>
                <span className="text-xs text-latte/70">
                  ×{coffee.unlockCount} 杯
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Locked card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <div className="glass-card rounded-2xl overflow-hidden h-full relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${coffee.gradient} opacity-10`} />
        <div className="relative p-5 flex flex-col items-center justify-center h-full min-h-[280px]">
          {/* Lock icon and question mark */}
          <div className="relative mb-4">
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 opacity-20"
              animate={{ opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Coffee className="h-8 w-8 text-white/60" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl opacity-30">?</span>
            </div>
          </div>

          {/* Name (dimmed) */}
          <h3 className="text-lg font-bold text-white/20 mb-1">{coffee.name}</h3>
          <span className="text-xs text-white/10 mb-4">{coffee.nameEn}</span>

          {/* Lock badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <svg className="w-3 h-3 text-white/30" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-white/30">未解锁</span>
          </div>

          {/* Caffeine hint */}
          <div className="absolute bottom-3 text-[10px] text-white/10">
            {coffee.caffeineMg}mg 咖啡因
          </div>
        </div>
      </div>
    </motion.div>
  );
}
