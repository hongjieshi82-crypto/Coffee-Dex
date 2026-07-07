"use client";

import { motion } from "framer-motion";

interface ConnectionPanelProps {
  connected: boolean;
  onConnect: () => void;
}

export default function ConnectionPanel({ connected, onConnect }: ConnectionPanelProps) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="glass-card rounded-2xl p-5 flex flex-col items-center gap-4 min-w-[200px]"
    >
      <div className="text-xs text-latte/60 uppercase tracking-wider w-full text-center">
        连接舱
      </div>

      {/* QR Code placeholder */}
      <div className="relative w-28 h-28 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
        {!connected && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"
            animate={{ y: [-112, 112] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div className="grid grid-cols-5 grid-rows-5 gap-1 p-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${
                [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 19, 20, 22, 23, 24].includes(i)
                  ? "bg-white/40"
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? "bg-neon-green" : "bg-red-500"
            }`}
          />
          {!connected && (
            <motion.div
              className="absolute inset-0 w-3 h-3 rounded-full bg-red-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {connected && (
            <motion.div
              className="absolute inset-0 w-3 h-3 rounded-full bg-neon-green"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        <span className={`text-xs ${connected ? "text-neon-green" : "text-red-400"}`}>
          {connected ? "手机已连接" : "等待连接扫描枪"}
        </span>
      </div>

      {/* Connect button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onConnect}
        disabled={connected}
        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
          connected
            ? "bg-neon-green/10 text-neon-green border border-neon-green/30 cursor-default"
            : "bg-latte/10 text-latte border border-latte/30 hover:bg-latte/20"
        }`}
      >
        {connected ? "✓ 已连接" : "模拟扫码连接"}
      </motion.button>
    </motion.div>
  );
}
