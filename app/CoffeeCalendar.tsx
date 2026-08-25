"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CoffeeRecord, hasUsableStickerData } from "@/coffee-data";

interface CoffeeCalendarProps {
  records: CoffeeRecord[];
  onOpenDay: (dayKey: string) => void;
  compact?: boolean;
  monthCursor?: Date;
  onMonthCursorChange?: (cursor: Date) => void;
}

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export function CoffeeCalendar({
  records,
  onOpenDay,
  compact = false,
  monthCursor,
  onMonthCursorChange,
}: CoffeeCalendarProps) {
  const [internalCursor, setInternalCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const cursor = monthCursor ?? internalCursor;
  const updateCursor = (nextCursor: Date) => {
    if (!monthCursor) setInternalCursor(nextCursor);
    onMonthCursorChange?.(nextCursor);
  };

  const recordsByDay = useMemo(() => {
    const grouped = new Map<string, CoffeeRecord[]>();

    for (const record of records) {
      const key = getLocalDayKey(new Date(record.timestamp));
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
  const todayKey = getLocalDayKey(new Date());
  const cells = Array.from({ length: 42 }, (_, index) => {
    if (index < firstWeekday || index >= firstWeekday + daysInMonth) return null;
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
          <button type="button" onClick={() => updateCursor(new Date(year, month - 1, 1))} aria-label="上个月">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => updateCursor(new Date(year, month + 1, 1))} aria-label="下个月">
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
          const dayKey = getLocalDayKey(date);
          const dayRecords = recordsByDay.get(dayKey) ?? [];
          const latest = dayRecords[0];
          const visibleRecords = dayRecords.slice(0, 3).reverse();

          return (
            <button
              type="button"
              key={dayKey}
              className={`coffee-calendar-day ${dayKey === todayKey ? "today" : ""} ${latest ? "has-record" : "pointer-events-none cursor-default"}`}
              onClick={() => onOpenDay(dayKey)}
              disabled={!latest}
              aria-label={`${year}年${month + 1}月${day}日${latest ? `，${dayRecords.length}杯记录` : "，暂无记录"}`}
            >
              <span className="coffee-calendar-number">{day}</span>
              {latest ? (
                <>
                  <span className="coffee-calendar-sticker-wrap" data-sticker-count={visibleRecords.length}>
                    {visibleRecords.map((record) => {
                      return (
                        <span key={record.id} className="coffee-calendar-sticker-item">
                          {hasUsableStickerData(record) ? (
                            <img className="coffee-calendar-sticker" src={record.stickerData!} alt="" />
                          ) : record.imageData ? (
                            <span className="coffee-calendar-photo-stamp">
                              <img src={record.imageData} alt="" />
                            </span>
                          ) : (
                            <span className="coffee-calendar-sticker-missing" aria-hidden="true" />
                          )}
                        </span>
                      );
                    })}
                  </span>
                  {dayRecords.length > 1 && <span className="coffee-calendar-count">{dayRecords.length}</span>}
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="coffee-calendar-note">
        <span className="coffee-calendar-note-dot" /> 点击有记录的日期查看当天全部记录
      </div>
    </section>
  );
}

export function getLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
