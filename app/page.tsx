"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clipboard,
  Coffee,
  Filter,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import {
  CoffeeCategory,
  CoffeeRecord,
  coffeeCategories,
  coffeeTypeMap,
} from "@/coffee-data";
import { AuthGate } from "@/app/AuthGate";
import { useCoffeeAuth } from "@/use-coffee-auth";

interface RecordsResponse {
  records: CoffeeRecord[];
  updatedAt: number;
}

interface NetworkResponse {
  mobileUrl: string;
  lanIps: string[];
}

const timeFilterLabels: Record<string, string> = {
  all: "全部",
  week: "本周",
  month: "本月",
  year: "本年",
};

export default function Home() {
  const router = useRouter();
  const auth = useCoffeeAuth();
  const {
    isAuthEnabled,
    loading: authLoading,
    user: authUser,
    getAuthHeaders,
    signOut,
  } = auth;
  const [records, setRecords] = useState<CoffeeRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileUrl, setMobileUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);
  const [detailRecord, setDetailRecord] = useState<CoffeeRecord | null>(null);
  const [reportRecord, setReportRecord] = useState<CoffeeRecord | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const initializedRef = useRef(false);
  const recordIdsRef = useRef<Set<string>>(new Set());

  const refreshRecords = useCallback(async () => {
    if (isAuthEnabled && !authUser) {
      setRecords([]);
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch("/api/records", { cache: "no-store", headers });
    if (!response.ok) {
      if (response.status === 401) {
        setRecords([]);
        void signOut();
      }
      return;
    }

    const data = (await response.json()) as RecordsResponse;
    const incoming = data.records;

    if (initializedRef.current) {
      const newRecord = incoming.find((record) => !recordIdsRef.current.has(record.id));
      if (newRecord) setReportRecord(newRecord);
    } else {
      initializedRef.current = true;
    }

    recordIdsRef.current = new Set(incoming.map((record) => record.id));
    setRecords(incoming);
  }, [authUser, getAuthHeaders, isAuthEnabled, signOut]);

  useEffect(() => {
    const shouldOpenMobile =
      window.matchMedia("(max-width: 760px)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);

    if (shouldOpenMobile) {
      router.replace("/mobile");
    }
  }, [router]);

  useEffect(() => {
    if (isAuthEnabled && (authLoading || !authUser)) return;

    const firstRefresh = window.setTimeout(refreshRecords, 0);
    const interval = window.setInterval(refreshRecords, 1500);

    return () => {
      window.clearTimeout(firstRefresh);
      window.clearInterval(interval);
    };
  }, [authLoading, authUser, isAuthEnabled, refreshRecords]);

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch("/api/network", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: NetworkResponse) => setMobileUrl(data.mobileUrl))
      .catch(() => setMobileUrl(`${window.location.origin}/mobile`));
  }, []);

  const selectedCategory = useMemo(
    () => coffeeCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId]
  );

  const totalCaffeine = useMemo(() => records.reduce((sum, record) => sum + record.caffeine, 0), [records]);
  const weekCups = useMemo(() => {
    const weekStart = getWeekStart(now);
    return records.filter((record) => record.timestamp >= weekStart).length;
  }, [now, records]);
  const monthCups = useMemo(() => {
    const monthStart = getMonthStart(now);
    return records.filter((record) => record.timestamp >= monthStart).length;
  }, [now, records]);
  const visibleRecords = useMemo(() => {
    if (!selectedCategory) return [];

    return records
      .filter((record) => {
        const inCategory = record.categoryId === selectedCategory.id;
        const inSubtype = selectedSubtype === "all" || record.coffeeType === selectedSubtype;
        const inTime = matchesTimeFilter(record, timeFilter, now);

        return inCategory && inSubtype && inTime;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [now, records, selectedCategory, selectedSubtype, timeFilter]);

  useEffect(() => {
    initializedRef.current = false;
    recordIdsRef.current = new Set();

    const resetTimer = window.setTimeout(() => {
      setRecords([]);
      setDetailRecord(null);
      setReportRecord(null);
      setHistoryOpen(false);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [authUser?.id, isAuthEnabled]);

  const copyMobileUrl = async () => {
    if (!mobileUrl) return;

    await navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubtype("all");
    setTimeFilter("all");
    setFilterOpen(false);
  };

  const backToCategories = () => {
    setSelectedCategoryId(null);
    setSelectedSubtype("all");
    setTimeFilter("all");
    setFilterOpen(false);
  };

  const deleteRecord = async (id: string) => {
    const headers = await getAuthHeaders();

    const response = await fetch(`/api/records?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
    if (response.status === 401) {
      setRecords([]);
      void signOut();
      return;
    }

    setDetailRecord(null);
    setReportRecord(null);
    refreshRecords();
  };

  const reportCoffee = reportRecord ? coffeeTypeMap[reportRecord.coffeeType] : null;
  const qrSrc = mobileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(mobileUrl)}`
    : "";

  if (isAuthEnabled && (authLoading || !authUser)) {
    return <AuthGate auth={auth} surface="pc" />;
  }

  return (
    <main className="pc-view min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(195,159,118,0.03),transparent_70%)]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(195,159,118,0.02),transparent_70%)]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(195,159,118,0.01),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-6 py-6">
        <header className="flex items-center justify-between pc-fade-down">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-latte">Coffee-Dex</h1>
            <p className="text-xs text-white/40">职场咖啡图鉴 · 记录本</p>
          </div>
          <div className="flex items-center gap-3">
            {isAuthEnabled && authUser && (
              <>
                <span className="max-w-[220px] truncate text-xs text-white/30">{authUser.email}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40 transition hover:text-latte"
                >
                  退出
                </button>
              </>
            )}
            <span className="text-xs text-white/20">v8.0 · Cloud Ready</span>
          </div>
        </header>

        <section className="flex flex-wrap items-stretch gap-4">
          <StatusPanel totalCaffeine={totalCaffeine} weekCups={weekCups} monthCups={monthCups} hasRecords={records.length > 0} />
          <LogCard records={records} onOpen={() => setHistoryOpen(true)} now={now} />
          <ConnectionPanel
            mobileUrl={mobileUrl}
            qrSrc={qrSrc}
            copied={copied}
            onCopy={copyMobileUrl}
          />
        </section>

        <section className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-lg font-bold text-latte">咖啡图鉴</h2>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(195,159,118,0.2),transparent)]" />
            {!selectedCategory && records.length > 0 && (
              <span className="text-xs text-white/30">已录入 {records.length} 杯</span>
            )}
            {selectedCategory && (
              <div className="topbar-filter-wrap show">
                <button type="button" className="topbar-filter-btn" onClick={() => setFilterOpen((open) => !open)}>
                  <Filter className="h-3.5 w-3.5" />
                  <span>{timeFilterLabels[timeFilter]}</span>
                  <span className="text-[10px] opacity-40">▼</span>
                </button>
                <div className={`topbar-filter-dropdown ${filterOpen ? "show" : ""}`}>
                  {Object.entries(timeFilterLabels).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`topbar-filter-option ${timeFilter === id ? "active" : ""}`}
                      onClick={() => {
                        setTimeFilter(id);
                        setFilterOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedCategory ? (
            <CategoryDetail
              category={selectedCategory}
              records={records}
              visibleRecords={visibleRecords}
              selectedSubtype={selectedSubtype}
              onBack={backToCategories}
              onSubtypeChange={setSelectedSubtype}
              onOpenRecord={setDetailRecord}
              onDeleteRecord={deleteRecord}
            />
          ) : (
            <CategoryOverview records={records} onOpenCategory={openCategory} />
          )}
        </section>

        <footer className="border-t border-white/5 py-6 text-center">
          <p className="text-xs text-white/20">Coffee-Dex · 每一杯咖啡，都是打工人的勋章</p>
          <p className="mt-1 text-[10px] text-white/10">
            {isAuthEnabled ? "Supabase 云端同步 · 手机录入，PC 实时刷新" : "Next API 本地同步 · 手机录入，PC 实时刷新"}
          </p>
        </footer>
      </div>

      {detailRecord && (
        <DetailOverlay
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {reportRecord && reportCoffee && (
        <ReportOverlay
          record={reportRecord}
          isNew={records.filter((record) => record.coffeeType === reportRecord.coffeeType).length <= 1}
          onClose={() => setReportRecord(null)}
          onOpenDetail={() => {
            setDetailRecord(reportRecord);
            setReportRecord(null);
          }}
        />
      )}

      {historyOpen && (
        <HistoryOverlay
          records={records}
          now={now}
          onClose={() => setHistoryOpen(false)}
          onOpenRecord={(record) => {
            setHistoryOpen(false);
            setDetailRecord(record);
          }}
        />
      )}
    </main>
  );
}

function StatusPanel({
  totalCaffeine,
  weekCups,
  monthCups,
  hasRecords,
}: {
  totalCaffeine: number;
  weekCups: number;
  monthCups: number;
  hasRecords: boolean;
}) {
  return (
    <section className="glass-card flex min-w-[300px] flex-1 items-center justify-between rounded-2xl px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-latte/20 bg-latte/10">
          <Coffee className="h-5 w-5 text-latte animate-breathe" />
          <div className="absolute -top-1 left-1/2 h-3 w-0.5 -translate-x-1/2 rounded-full bg-white/30 animate-steam" />
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-latte/60">当前续命值</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-latte">{totalCaffeine}</span>
            <span className="text-sm text-latte/50">mg 咖啡因</span>
          </div>
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <div className="h-2 w-2 rounded-full bg-neon-green animate-breathe" />
        <span className="text-sm text-white/70">{hasRecords ? "咖啡因燃料已装填" : "等待第一杯咖啡录入..."}</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-latte/60">本周已录入</div>
          <div className="text-lg font-semibold text-latte">{weekCups} 杯</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-latte/60">本月总杯数</div>
          <div className="text-lg font-semibold text-neon-green">{monthCups}</div>
        </div>
      </div>
    </section>
  );
}

function LogCard({ records, now, onOpen }: { records: CoffeeRecord[]; now: number; onOpen: () => void }) {
  const monthCups = records.filter((record) => record.timestamp >= getMonthStart(now)).length;

  return (
    <button
      type="button"
      id="logCard"
      onClick={onOpen}
      className="glass-card flex min-w-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-5 transition"
    >
      <div className="w-full text-center text-xs uppercase tracking-wider text-latte/60">咖啡日志</div>
      <BookOpen className="h-8 w-8 text-latte/75" />
      <div className="text-center text-xs text-white/40">{records.length ? `本月 ${monthCups} 杯` : "暂无记录"}</div>
    </button>
  );
}

function ConnectionPanel({
  mobileUrl,
  qrSrc,
  copied,
  onCopy,
}: {
  mobileUrl: string;
  qrSrc: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="glass-card flex min-w-[200px] flex-col items-center gap-4 rounded-2xl p-5">
      <div className="w-full text-center text-xs uppercase tracking-wider text-latte/60">连接舱</div>
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-2">
        {qrSrc ? (
          <img src={qrSrc} alt="手机录入口二维码" className="h-full w-full" />
        ) : (
          <QrCode className="h-10 w-10 text-black/30" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-neon-green" />
          <div className="absolute inset-0 h-3 w-3 rounded-full bg-neon-green animate-pulse-dot" />
        </div>
        <span className="text-xs text-neon-green">手机录入口已就绪</span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex max-w-[210px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/35 transition hover:text-latte"
      >
        <Clipboard className="h-3 w-3 shrink-0" />
        <span className="truncate">{copied ? "已复制" : mobileUrl || "正在生成手机地址..."}</span>
      </button>
      <div className="flex items-center gap-1 text-[10px] text-white/20">
        <Smartphone className="h-3 w-3" />
        同一 Wi-Fi 下手机打开
      </div>
    </section>
  );
}

function CategoryOverview({
  records,
  onOpenCategory,
}: {
  records: CoffeeRecord[];
  onOpenCategory: (categoryId: string) => void;
}) {
  return (
    <div className="cat-grid">
      {coffeeCategories.map((category, index) => {
        const cups = records.filter((record) => record.categoryId === category.id).length;

        return (
          <button
            key={category.id}
            type="button"
            className="cat-card card-enter"
            style={{ animationDelay: `${index * 0.08}s` }}
            onClick={() => onOpenCategory(category.id)}
          >
            <div className="cat-card-bg bg-[linear-gradient(135deg,#2a2520,#1a1612)]" />
            <div className="cat-card-inner">
              <div className="cat-card-name">{category.name}</div>
              <div className="cat-card-en">{category.en}</div>
              <div className="cat-card-footer">
                <div className="cat-card-cups">
                  <span>{cups}</span> 杯
                </div>
                <div className="cat-card-arrow">查看 →</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CategoryDetail({
  category,
  records,
  visibleRecords,
  selectedSubtype,
  onBack,
  onSubtypeChange,
  onOpenRecord,
  onDeleteRecord,
}: {
  category: CoffeeCategory;
  records: CoffeeRecord[];
  visibleRecords: CoffeeRecord[];
  selectedSubtype: string;
  onBack: () => void;
  onSubtypeChange: (subtype: string) => void;
  onOpenRecord: (record: CoffeeRecord) => void;
  onDeleteRecord: (id: string) => void;
}) {
  return (
    <section>
      <div className="sub-header">
        <button type="button" className="sub-back-btn" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div className="sub-title">{category.name}</div>
        <span className="sub-en">{category.en}</span>
      </div>

      <div className="subtype-tabs">
        <button
          type="button"
          className={`subtype-tab ${selectedSubtype === "all" ? "active" : ""}`}
          onClick={() => onSubtypeChange("all")}
        >
          全部
        </button>
        {category.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`subtype-tab ${selectedSubtype === item.id ? "active" : ""}`}
            onClick={() => onSubtypeChange(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="record-grid">
        {visibleRecords.length ? (
          visibleRecords.map((record, index) => (
            <RecordCard
              key={record.id}
              record={record}
              index={index}
              count={records.filter((item) => item.coffeeType === record.coffeeType).length}
              onOpen={() => onOpenRecord(record)}
              onDelete={() => onDeleteRecord(record.id)}
            />
          ))
        ) : (
          <div className="gallery-empty">这里还没有记录哦</div>
        )}
      </div>
    </section>
  );
}

function RecordCard({
  record,
  index,
  count,
  onOpen,
  onDelete,
}: {
  record: CoffeeRecord;
  index: number;
  count: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const coffee = coffeeTypeMap[record.coffeeType];
  const tags = [record.temp, record.sugar].filter(Boolean);

  return (
    <article className="record-card card-enter" style={{ animationDelay: `${index * 0.06}s` }} onClick={onOpen}>
      <button
        type="button"
        className="record-card-del"
        title="删除"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        ×
      </button>
      <div className="record-card-photo">
        {record.imageData ? (
          <img src={record.imageData} alt={record.coffeeName} loading="lazy" />
        ) : (
          <div className="no-img text-xl font-bold text-latte/25">{coffee?.name.slice(0, 2) ?? "咖啡"}</div>
        )}
      </div>
      <div className="record-card-body">
        <div className="record-card-name">{record.coffeeName}</div>
        {tags.length > 0 && (
          <div className="record-card-tags">
            {tags.map((tag) => (
              <span key={tag} className="record-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="record-card-meta">
          <span>{record.volumeMl}ml</span>
          <span className="green">+{record.caffeine}mg</span>
          <span>第 {count} 杯</span>
        </div>
        <div className="record-card-comment">“{record.aiComment}”</div>
        <div className="record-card-date">{formatDateTime(record.timestamp)}</div>
      </div>
    </article>
  );
}

function DetailOverlay({ record, onClose }: { record: CoffeeRecord; onClose: () => void }) {
  const coffee = coffeeTypeMap[record.coffeeType];
  const tags = [record.temp, record.sugar].filter(Boolean);

  return (
    <div className="detail-overlay active" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="detail-card">
        <button type="button" className="detail-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        <div className="detail-photo-container">
          <div id="detailPhotoWrap">
            {record.imageData ? (
              <img src={record.imageData} alt={record.coffeeName} />
            ) : (
              <div className="detail-no-photo bg-[linear-gradient(135deg,rgba(195,159,118,0.12),rgba(26,22,18,0.6))]">
                <div className="text-xl font-bold text-latte/25">{coffee?.name.slice(0, 2) ?? "咖啡"}</div>
              </div>
            )}
          </div>
          <div className="detail-photo-overlay">
            <h2 className="detail-info-name">{record.coffeeName}</h2>
            <div className="detail-info-tags">
              {tags.map((tag) => (
                <span key={tag} className="detail-tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="detail-info-meta">
              <span>{record.volumeMl}ml</span>
              <span className="green">+{record.caffeine}mg 咖啡因</span>
            </div>
          </div>
        </div>
        <div className="detail-comment-area">
          <div className="detail-info-comment">“{record.aiComment}”</div>
          <div className="detail-info-time">{formatDateTime(record.timestamp)}</div>
        </div>
      </div>
    </div>
  );
}

function ReportOverlay({
  record,
  isNew,
  onClose,
  onOpenDetail,
}: {
  record: CoffeeRecord;
  isNew: boolean;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div className="report-overlay active" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="report-card">
        <button type="button" className="report-close-btn" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 text-center">
          <div className="text-[22px] font-bold text-latte">新录入报告</div>
          <div className="mt-1 text-xs text-white/30">{formatDateTime(record.timestamp)}</div>
        </div>
        <div className="mb-5 flex items-center gap-5">
          <div className="relative h-[90px] w-[90px] shrink-0">
            <div className="absolute -inset-[3px] animate-spin rounded-full bg-[conic-gradient(var(--latte),var(--neon-green),var(--electric-pink),var(--latte))]" />
            <div className="absolute inset-0.5 overflow-hidden rounded-full bg-coffee-black">
              {record.imageData && <img src={record.imageData} alt={record.coffeeName} className="h-full w-full object-cover" />}
            </div>
          </div>
          <div>
            <div className="text-[22px] font-extrabold text-latte">{record.coffeeName}</div>
            <div className="mt-1 text-sm text-white/40">{record.volumeMl}ml</div>
            <div className="mt-2 text-base font-bold text-neon-green">+{record.caffeine}mg 咖啡因</div>
          </div>
        </div>
        <div className="my-4 h-px bg-[linear-gradient(90deg,transparent,rgba(195,159,118,0.2),transparent)]" />
        <div className="mb-4 text-center">
          <span className={`inline-flex rounded-full border px-5 py-2 text-[13px] font-semibold ${isNew ? "border-neon-green/25 bg-neon-green/10 text-neon-green" : "border-latte/25 bg-latte/10 text-latte"}`}>
            {isNew ? "新品类解锁！图鉴已更新" : "本品类再次续命"}
          </span>
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[2px] text-latte/50">AI 评语</div>
          <div className="font-handwrite text-xl italic leading-7 text-latte/85">“{record.aiComment}”</div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onOpenDetail} className="flex-1 rounded-[14px] bg-[linear-gradient(135deg,var(--latte),#a67c52)] px-5 py-3.5 text-sm font-semibold text-coffee-black">
            查看图鉴记录 →
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white/60">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryOverlay({
  records,
  now,
  onClose,
  onOpenRecord,
}: {
  records: CoffeeRecord[];
  now: number;
  onClose: () => void;
  onOpenRecord: (record: CoffeeRecord) => void;
}) {
  const sorted = records.slice().sort((a, b) => b.timestamp - a.timestamp);
  const totalCaffeine = records.reduce((sum, record) => sum + record.caffeine, 0);
  const monthCups = records.filter((record) => record.timestamp >= getMonthStart(now)).length;

  return (
    <div className="log-overlay active" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="log-panel">
        <button type="button" className="log-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        <div className="log-header">
          <h2>咖啡日志</h2>
          <div className="log-subtitle">{formatMonthLabel(now)} · 共 {records.length} 条记录</div>
        </div>
        <div className="log-stats-row">
          <div className="log-stat-card"><div className="stat-value">{records.length}</div><div className="stat-label">总杯数</div></div>
          <div className="log-stat-card"><div className="stat-value green">{totalCaffeine}mg</div><div className="stat-label">总咖啡因</div></div>
          <div className="log-stat-card"><div className="stat-value">{new Set(records.map((record) => record.coffeeType)).size}/38</div><div className="stat-label">图鉴解锁</div></div>
          <div className="log-stat-card"><div className="stat-value">{monthCups}</div><div className="stat-label">本月</div></div>
        </div>
        <div className="log-content">
          {sorted.length ? (
            <div className="log-timeline">
              {sorted.map((record) => {
                const category = coffeeCategories.find((item) => item.id === record.categoryId);

                return (
                  <button key={record.id} type="button" className="log-entry" onClick={() => onOpenRecord(record)}>
                    <div className="log-entry-photo">
                      {record.imageData ? <img src={record.imageData} alt={record.coffeeName} /> : <span className="placeholder-icon" />}
                    </div>
                    <div className="log-entry-info">
                      <div className="log-entry-name">{record.coffeeName}</div>
                      <div className="log-entry-meta">{category?.name ?? ""} · {record.volumeMl}ml · “{record.aiComment.slice(0, 20)}{record.aiComment.length > 20 ? "..." : ""}”</div>
                    </div>
                    <div className="log-entry-caffeine">+{record.caffeine}mg</div>
                    <div className="log-entry-date">{formatShortDate(record.timestamp)}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="log-empty">还没有咖啡记录<br />去手机端录入第一杯咖啡吧</div>
          )}
        </div>
      </div>
    </div>
  );
}

function matchesTimeFilter(record: CoffeeRecord, filter: string, now: number) {
  if (filter === "week") return record.timestamp >= getWeekStart(now);
  if (filter === "month") return record.timestamp >= getMonthStart(now);
  if (filter === "year") return record.timestamp >= getYearStart(now);
  return true;
}

function getWeekStart(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp) : new Date(0);
  const dayOfWeek = date.getDay() || 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek + 1);
  start.setHours(0, 0, 0, 0);

  return start.getTime();
}

function getMonthStart(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp) : new Date(0);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function getYearStart(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp) : new Date(0);
  return new Date(date.getFullYear(), 0, 1).getTime();
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function formatShortDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatMonthLabel(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp) : new Date();
  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  return `${date.getFullYear()}年${monthNames[date.getMonth()]}`;
}
