"use client";

import { motion } from "framer-motion";
import { Coffee } from "lucide-react";

interface StatusBarProps {
  totalCaffeine: number;
  statusMessage: string;
  unlockedCount: number;
  totalCount: number;
}

export default function StatusBar({
  totalCaffeine,
  statusMessage,
  unlockedCount,
  totalCount,
}: StatusBarProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card rounded-2xl px-5 sm:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
    >
      {/* Left: Caffeine counter */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-latte/20 bg-latte/10"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          >
            <Coffee className="h-5 w-5 text-latte" />
          </motion.div>
          <motion.div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-white/30 rounded-full"
            animate={{ y: [-2, -8], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div>
          <div className="text-xs text-latte/60 uppercase tracking-wider mb-1">
            当前续命值
          </div>
          <div className="flex items-baseline gap-2">
            <motion.span
              key={totalCaffeine}
              initial={{ scale: 1.2, color: "#39FF14" }}
              animate={{ scale: 1, color: "#C39F76" }}
              className="text-3xl font-bold text-latte tabular-nums"
            >
              {totalCaffeine}
            </motion.span>
            <span className="text-sm text-latte/50">mg 咖啡因</span>
          </div>
        </div>
      </div>

      {/* Center: Status message */}
      <div className="hidden md:flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-neon-green"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-sm text-white/70">{statusMessage}</span>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-4 sm:gap-6 self-stretch sm:self-auto justify-between sm:justify-start">
        <div className="text-right">
          <div className="text-xs text-latte/60 uppercase tracking-wider">图鉴完成度</div>
          <div className="text-lg font-semibold text-latte">
            {unlockedCount}/{totalCount}
          </div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-right">
          <div className="text-xs text-latte/60 uppercase tracking-wider">今日杯数</div>
          <div className="text-lg font-semibold text-neon-green">5</div>
        </div>
      </div>
    </motion.div>
  );
}
