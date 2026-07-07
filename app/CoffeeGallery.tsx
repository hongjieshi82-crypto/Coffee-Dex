"use client";

import { CoffeeItem } from "@/lib/mock-data";
import CoffeeCard from "./CoffeeCard";

interface CoffeeGalleryProps {
  coffees: CoffeeItem[];
  unlockingId: string | null;
}

export default function CoffeeGallery({ coffees, unlockingId }: CoffeeGalleryProps) {
  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-latte">咖啡图鉴</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-latte/20 to-transparent" />
        <span className="text-xs text-white/30">
          {coffees.filter(c => c.unlocked).length}/{coffees.length} 已解锁
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {coffees.map((coffee, index) => (
          <CoffeeCard
            key={coffee.id}
            coffee={coffee}
            index={index}
            isUnlocking={unlockingId === coffee.id}
          />
        ))}
      </div>
    </div>
  );
}
