"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import { CoffeeRecord } from "@/coffee-data";

interface CoffeeCalendarProps {
  records: CoffeeRecord[];
  onOpenRecord: (record: CoffeeRecord) => void;
  compact?: boolean;
}

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export function CoffeeCalendar({ records, onOpenRecord, compact = false }: CoffeeCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const recordsByDay = useMemo(() => {
    const grouped = new Map<string, CoffeeRecord[]>();

    for (const record of records) {
      const key = getDayKey(new Date(record.timestamp));
      const list = grouped.get(key) ?? [];
      list.push(record);
      grouped.set(key, list);
    }

    grouped.forEach((list) => list.sort((a, b) => b.timestamp - a.timestamp));
    return grouped;
  }, [records]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getDayKey(new Date());
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null;
    return index - firstWeekday + 1;
  });

  return (
    <section className={`coffee-calendar ${compact ? "coffee-calendar-compact" : ""}`}>
      <div className="coffee-calendar-header">
        <div>
          <div className="coffee-calendar-kicker">Coffee log calendar</div>
          <h2>{year} 年 {month + 1} 月</h2>
        </div>
        <div className="coffee-calendar-nav">
          <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="上个月">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="下个月">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="coffee-calendar-weekdays">
        {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="coffee-calendar-grid">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="coffee-calendar-day empty" aria-hidden="true" />;

          const date = new Date(year, month, day);
          const dayKey = getDayKey(date);
          const dayRecords = recordsByDay.get(dayKey) ?? [];
          const latest = dayRecords[0];

          return (
            <button
              type="button"
              key={dayKey}
              className={`coffee-calendar-day ${dayKey === todayKey ? "today" : ""} ${latest ? "has-record" : ""}`}
              onClick={() => latest && onOpenRecord(latest)}
              aria-label={`${year}年${month + 1}月${day}日${latest ? `，${dayRecords.length}杯记录` : "，暂无记录"}`}
            >
              <span className="coffee-calendar-number">{day}</span>
              {latest ? (
                <span className="coffee-calendar-sticker-wrap">
                  {latest.stickerData || latest.imageData ? (
                    <img className="coffee-calendar-sticker" src={latest.stickerData ?? latest.imageData} alt="" />
                  ) : (
                    <span className="coffee-calendar-sticker coffee-calendar-placeholder"><Coffee size={16} /></span>
                  )}
                  {dayRecords.length > 1 && <span className="coffee-calendar-count">{dayRecords.length}</span>}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="coffee-calendar-note">
        <span className="coffee-calendar-note-dot" /> 有记录的日期显示当天最新一杯
      </div>
    </section>
  );
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
