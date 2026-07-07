"use client";

/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ChevronLeft, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { CoffeeRecord, coffeeCategories, coffeeTypeMap, searchCoffeeTypes } from "@/coffee-data";
import { AuthGate } from "@/app/AuthGate";
import { useCoffeeAuth } from "@/use-coffee-auth";

const tempOptions = ["热", "冰", "常温"];
const sugarOptions = ["无糖", "微甜", "标准", "很甜"];
const quickVolumes = [
  { label: "小杯", ml: 150 },
  { label: "中杯", ml: 240 },
  { label: "大杯", ml: 360 },
  { label: "超大杯", ml: 480 },
];

interface RecognitionResult {
  isDrink: boolean;
  confidence: number;
  vessel: string | null;
  drinkType: string | null;
  reason: string;
  provider: "openai" | "manual";
  allowManualConfirm: boolean;
}

interface RecordsResponse {
  records: CoffeeRecord[];
  updatedAt: number;
}

export default function MobilePage() {
  const auth = useCoffeeAuth();
  const {
    isAuthEnabled,
    loading: authLoading,
    user: authUser,
    getAuthHeaders,
  } = auth;
  const [imageData, setImageData] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [sugar, setSugar] = useState<string | null>(null);
  const [volumeMl, setVolumeMl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [manualConfirmed, setManualConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [lastRecord, setLastRecord] = useState<CoffeeRecord | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [screen, setScreen] = useState<"entry" | "home">("entry");
  const [records, setRecords] = useState<CoffeeRecord[]>([]);

  const refreshRecords = useCallback(async () => {
    if (isAuthEnabled && !authUser) {
      setRecords([]);
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch("/api/records", { cache: "no-store", headers });

    if (!response.ok) return;

    const data = (await response.json()) as RecordsResponse;
    setRecords(data.records);
  }, [authUser, getAuthHeaders, isAuthEnabled]);

  const selectedCategory = useMemo(
    () => coffeeCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId]
  );
  const selectedCoffee = selectedTypeId ? coffeeTypeMap[selectedTypeId] : null;
  const searchMatches = useMemo(() => searchCoffeeTypes(searchTerm), [searchTerm]);
  const canContinueAfterRecognition =
    !recognizing && Boolean(imageData) && Boolean(recognition?.isDrink || manualConfirmed);
  const canSubmit = Boolean(canContinueAfterRecognition && selectedCoffee && Number(volumeMl) > 0 && !submitting);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("正在压缩照片...");
    const compressed = await compressImage(file);
    setImageData(compressed);
    setRecognition(null);
    setManualConfirmed(false);
    setLastRecord(null);
    setShowResultCard(false);
    void recognizeImage(compressed);
    event.target.value = "";
  };

  const resetForm = () => {
    setImageData(null);
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSearchTerm("");
    setTemp(null);
    setSugar(null);
    setVolumeMl("");
    setRecognizing(false);
    setRecognition(null);
    setManualConfirmed(false);
    setMessage("");
    setLastRecord(null);
    setShowResultCard(false);
  };

  const resetPhoto = () => {
    setImageData(null);
    setRecognition(null);
    setManualConfirmed(false);
    setRecognizing(false);
    setMessage("");
  };

  const quickSelect = (categoryId: string, typeId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedTypeId(typeId);
    setSearchTerm("");
    setMessage("已自动匹配到大类和子类。");
  };

  const recognizeImage = async (photoData: string) => {
    setRecognizing(true);
    setMessage("AI 正在识别是否为饮品...");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6_500);

    try {
      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: photoData }),
        signal: controller.signal,
      });

      const data = (await response.json()) as RecognitionResult | { error?: string };
      const errorMessage = "error" in data ? data.error : undefined;

      if (!response.ok || errorMessage) {
        setRecognition({
          isDrink: true,
          confidence: 0,
          vessel: null,
          drinkType: null,
          reason: errorMessage ?? "AI 识别失败，已切换为人工确认。",
          provider: "manual",
          allowManualConfirm: true,
        });
        setManualConfirmed(true);
        setMessage("AI 识别失败，已进入人工确认模式。");
        return;
      }

      const recognitionData = data as RecognitionResult;

      setRecognition(recognitionData);
      setManualConfirmed(recognitionData.isDrink || recognitionData.provider === "manual");
      setMessage(
        recognitionData.provider === "manual"
          ? recognitionData.reason
          : recognitionData.isDrink
            ? `AI 识别通过：${recognitionData.reason}`
            : `AI 未确认这是饮品：${recognitionData.reason}`
      );
    } catch {
      setRecognition({
        isDrink: true,
        confidence: 0,
        vessel: null,
        drinkType: null,
        reason: "AI 识别等待过久，已切换为人工确认。",
        provider: "manual",
        allowManualConfirm: true,
      });
      setManualConfirmed(true);
      setMessage("AI 识别等待过久，已进入人工确认模式。");
    } finally {
      window.clearTimeout(timeout);
      setRecognizing(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !selectedCoffee || !imageData) return;

    try {
      setSubmitting(true);
      setMessage("提交中...");

      const displayName = [selectedCoffee.name, temp, sugar].filter(Boolean).join(" · ");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          coffeeType: selectedCoffee.id,
          coffeeName: displayName,
          imageData,
          volumeMl: Number(volumeMl),
          temp,
          sugar,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "提交失败，请重试" }));
        setMessage(error.error ?? "提交失败，请重试");
        return;
      }

      const data = (await response.json()) as { record: CoffeeRecord };
      setLastRecord(data.record);
      setRecords((current) => [data.record, ...current.filter((record) => record.id !== data.record.id)]);
      setShowResultCard(true);
      setMessage("");
    } catch {
      setMessage("网络异常，提交失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const openHome = () => {
    setShowResultCard(false);
    setScreen("home");
    void refreshRecords();
  };

  if (isAuthEnabled && (authLoading || !authUser)) {
    return <AuthGate auth={auth} surface="mobile" />;
  }

  if (screen === "home") {
    return (
      <MobileHome
        records={records}
        authEmail={authUser?.email ?? null}
        onSignOut={isAuthEnabled ? auth.signOut : undefined}
        onBackToEntry={() => {
          resetForm();
          setScreen("entry");
        }}
      />
    );
  }

  return (
    <main className="mobile-view">
      <div className="m-ambient" />
      <div className="m-grain" />

      <div className="m-app">
        <header className="m-header">
          <h1>Coffee-Dex</h1>
          <p className="sub">记录每一杯，点亮你的图鉴</p>
        </header>

        <section className="m-upload-card">
          <label className={`m-upload-zone ${imageData ? "has-photo" : ""}`} htmlFor="mFileInput">
            {!imageData && <Camera className="m-upload-icon" strokeWidth={1.8} />}
            <span className="label">上传咖啡照片</span>
            <span className="hint">支持拍照或从相册选择</span>
            <span className="tap-hint">点击上传</span>

            <div className={`m-preview-wrap ${imageData ? "active" : ""}`}>
              {imageData && <img src={imageData} alt="咖啡照片预览" />}
              <button
                type="button"
                className="m-preview-resel"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  resetPhoto();
                }}
              >
                <RotateCcw size={13} />
                重选
              </button>
            </div>

            <div className={`m-ai-overlay ${recognizing ? "active" : ""}`}>
              <div className="m-ai-spinner" />
              <div className="m-ai-text">AI 识别中...</div>
              <div className="m-ai-sub">正在确认是否为咖啡饮品</div>
            </div>
          </label>
          <input id="mFileInput" type="file" accept="image/*" onChange={handlePhoto} />
        </section>

        {imageData && recognition && (
          <section className={`m-ai-status-card ${recognition.isDrink || manualConfirmed ? "pass" : "warn"}`}>
            <div className="m-ai-status-title">
              {recognition.provider === "openai" ? "AI 饮品识别" : "人工确认模式"}
            </div>
            <div className="m-ai-status-text">
              {recognition.reason}
              {recognition.confidence > 0 ? `（置信度 ${Math.round(recognition.confidence * 100)}%）` : ""}
            </div>
            {(recognition.vessel || recognition.drinkType) && (
              <div className="m-ai-status-tags">
                {recognition.vessel && <span>{recognition.vessel}</span>}
                {recognition.drinkType && <span>{recognition.drinkType}</span>}
              </div>
            )}
            {!recognition.isDrink && !manualConfirmed && recognition.allowManualConfirm && (
              <button
                type="button"
                className="m-ai-confirm-btn"
                onClick={() => {
                  setManualConfirmed(true);
                  setMessage("已人工确认这是饮品照片。");
                }}
              >
                我确认这是饮品，继续录入
              </button>
            )}
          </section>
        )}

        <section className={`m-search-section ${canContinueAfterRecognition ? "show" : ""}`}>
          <div className="m-section-title">或输入咖啡名称</div>
          <div className="m-search-input-wrap">
            <Search className="m-search-icon" size={16} strokeWidth={1.8} />
            <input
              type="text"
              className="m-search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="例如：拿铁、美式、澳白..."
            />
          </div>
          <div className={`m-search-results ${searchTerm.trim() ? "show" : ""}`}>
            {searchMatches.length ? (
              searchMatches.map(({ category, coffee }) => (
                <button
                  key={coffee.id}
                  type="button"
                  className="m-search-result-item"
                  onClick={() => quickSelect(category.id, coffee.id)}
                >
                  <span className="m-search-result-mark">{coffee.name.slice(0, 2)}</span>
                  <span className="sr-info">
                    <span className="sr-name">{coffee.name}</span>
                    <span className="sr-cat">
                      {category.name} · {coffee.en}
                    </span>
                  </span>
                  <span className="sr-arrow">→</span>
                </button>
              ))
            ) : (
              <div className="m-search-no-result">未找到匹配的咖啡，请手动选择</div>
            )}
          </div>
        </section>

        <section className={`m-type-section ${canContinueAfterRecognition ? "show" : ""}`}>
          <div className="m-category-row">
            {coffeeCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`m-category-chip ${selectedCategoryId === category.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setSelectedTypeId(null);
                  setSearchTerm("");
                }}
              >
                <span className="cat-info">
                  <span className="cat-name">{category.name}</span>
                  <span className="cat-en">{category.en}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={`m-type-section ${selectedCategory ? "show" : ""}`}>
          <div className="m-type-grid">
            {selectedCategory?.items.map((coffee) => (
              <button
                key={coffee.id}
                type="button"
                className={`m-type-chip ${selectedTypeId === coffee.id ? "selected" : ""}`}
                onClick={() => setSelectedTypeId(coffee.id)}
              >
                <span className="chip-cn">{coffee.name}</span>
                <span className="chip-en">{coffee.en}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`m-tags-section ${selectedCoffee ? "show" : ""}`}>
          <div className="m-section-title">标签</div>
          <ChipGroup label="温度" options={tempOptions} value={temp} onChange={setTemp} />
          <ChipGroup label="糖度" options={sugarOptions} value={sugar} onChange={setSugar} />
        </section>

        <section className={`m-volume-section ${selectedCoffee ? "show" : ""}`}>
          <div className="m-section-title">容量</div>
          <div className="m-volume-row">
            <input
              type="number"
              inputMode="numeric"
              className="m-volume-input"
              value={volumeMl}
              onChange={(event) => setVolumeMl(event.target.value)}
              placeholder="0"
              min="1"
              max="2000"
            />
            <span className="m-volume-unit">ml</span>
          </div>
          <div className="m-quick-sizes">
            {quickVolumes.map((option) => (
              <button
                key={option.ml}
                type="button"
                className={`m-size-chip ${volumeMl === String(option.ml) ? "selected" : ""}`}
                onClick={() => setVolumeMl(String(option.ml))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className="m-submit-area">
          <button type="button" className={`m-submit-btn ${canSubmit ? "ready" : ""}`} disabled={!canSubmit} onClick={submit}>
            {submitting ? "录入中..." : "录入图鉴"}
          </button>
        </div>

        <button type="button" className="m-home-link" onClick={openHome}>
          进入图鉴
        </button>

        <div className="m-status-bar">
          <div>
            <span className="dot" />
            <span className="text">手机端已连接 Web 图鉴</span>
          </div>
          <div className="sid">Coffee-Dex Mobile</div>
        </div>
      </div>

      {lastRecord && showResultCard && (
        <ResultCard
          record={lastRecord}
          onClose={() => {
            setShowResultCard(false);
            resetForm();
          }}
          onOpenHome={openHome}
        />
      )}

      <div className={`m-toast ${message ? "show" : ""}`}>{message}</div>
    </main>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="m-tags-group">
      <div className="m-tags-label">{label}</div>
      <div className="m-tags-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`m-tag-chip ${value === option ? "selected" : ""}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileHome({
  records,
  authEmail,
  onBackToEntry,
  onSignOut,
}: {
  records: CoffeeRecord[];
  authEmail?: string | null;
  onBackToEntry: () => void;
  onSignOut?: () => Promise<void>;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<CoffeeRecord | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const firstTick = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(updateNow, 60_000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, []);

  const selectedCategory = useMemo(
    () => coffeeCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId]
  );

  const totalCaffeine = useMemo(() => records.reduce((sum, record) => sum + record.caffeine, 0), [records]);
  const weekCups = useMemo(() => {
    if (!now) return records.length;

    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return records.filter((record) => record.timestamp >= weekAgo).length;
  }, [now, records]);
  const monthCups = useMemo(() => {
    if (!now) return records.length;

    const current = new Date(now);
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1).getTime();

    return records.filter((record) => record.timestamp >= monthStart).length;
  }, [now, records]);

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubtype("all");
    setSelectedRecord(null);
  };

  if (selectedCategory) {
    const visibleRecords = records.filter(
      (record) =>
        record.categoryId === selectedCategory.id &&
        (selectedSubtype === "all" || record.coffeeType === selectedSubtype)
    );

    return (
      <main className="mobile-view">
        <div className="m-cat-detail-overlay active">
          <div className="m-cat-detail-header">
            <div className="m-cat-detail-header-top">
              <button
                type="button"
                className="m-cat-detail-back"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedSubtype("all");
                  setSelectedRecord(null);
                }}
                aria-label="返回手机首页"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="m-cat-detail-title-wrap">
                <div className="m-cat-detail-title">{selectedCategory.name}</div>
                <div className="m-cat-detail-en">{selectedCategory.en}</div>
              </div>
              <div className="m-cat-detail-count-inline">{visibleRecords.length}杯</div>
              <button type="button" className="m-cat-detail-filter-btn-icon" aria-label="筛选">
                <SlidersHorizontal size={18} />
              </button>
            </div>
            <div className="m-cat-detail-subtabs">
              <SubtypeTab active={selectedSubtype === "all"} onClick={() => setSelectedSubtype("all")}>
                全部
              </SubtypeTab>
              {selectedCategory.items.map((item) => (
                <SubtypeTab key={item.id} active={selectedSubtype === item.id} onClick={() => setSelectedSubtype(item.id)}>
                  {item.name}
                </SubtypeTab>
              ))}
            </div>
          </div>

          <div className="m-cat-detail-grid">
            {visibleRecords.length ? (
              visibleRecords.map((record) => (
                <MobileRecordCard key={record.id} record={record} onClick={() => setSelectedRecord(record)} />
              ))
            ) : (
              <div className="m-cat-detail-empty">这里还没有记录哦</div>
            )}
          </div>
        </div>

        {selectedRecord && <MobileDetailPopup record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
      </main>
    );
  }

  return (
    <main className="mobile-view">
      <div className="m-home-overlay active">
        <div className="m-home-header-bar">
          <div className="m-home-header-top">
            <div className="m-home-brand">
              <span className="m-home-brand-text">Coffee-Dex</span>
            </div>
            <div className="m-home-version">打工人の咖啡因图鉴</div>
          </div>
          <div className="m-home-stats">
            <MobileStat value={totalCaffeine.toString()} label="当前续命值" unit="mg 咖啡因" />
            <div className="m-home-divider" />
            <MobileStat value={weekCups.toString()} label="本周已录入" unit="杯" />
            <div className="m-home-divider" />
            <MobileStat value={monthCups.toString()} label="本月总杯数" unit="杯" accent />
          </div>
        </div>

        <div className="m-home-section-title">
          <span>咖啡图鉴</span>
          {records.length > 0 && <span className="m-home-gallery-count">已录入 {records.length} 杯</span>}
        </div>

        <div className="m-home-cat-grid">
          {coffeeCategories.map((category) => {
            const cups = records.filter((record) => record.categoryId === category.id).length;

            return (
              <button key={category.id} type="button" className="m-home-cat-card" onClick={() => openCategory(category.id)}>
                <span className="m-home-cat-card-bg" />
                <span className="m-home-cat-card-inner">
                  <span className="m-home-cat-card-name">{category.name}</span>
                  <span className="m-home-cat-card-en">{category.en}</span>
                  <span className="m-home-cat-card-footer">
                    <span className="m-home-cat-card-cups">
                      <span>{cups}</span> 杯
                    </span>
                    <span className="m-home-cat-card-arrow">查看 →</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="m-home-footer">
          <button type="button" className="m-home-btn" onClick={onBackToEntry}>
            继续录入
          </button>
          {authEmail && <div className="m-home-user-info">{authEmail}</div>}
          {onSignOut && (
            <button type="button" className="m-home-btn-secondary" onClick={onSignOut}>
              退出登录
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function MobileStat({
  value,
  label,
  unit,
  accent,
}: {
  value: string;
  label: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="m-home-stat">
      <div className={`m-home-stat-value ${accent ? "green" : ""}`}>{value}</div>
      <div className="m-home-stat-label">{label}</div>
      <div className="m-home-stat-unit">{unit}</div>
    </div>
  );
}

function SubtypeTab({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`m-cat-detail-subtab ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function MobileRecordCard({ record, onClick }: { record: CoffeeRecord; onClick: () => void }) {
  const coffee = coffeeTypeMap[record.coffeeType];
  const tags = [record.temp, record.sugar].filter(Boolean);

  return (
    <button type="button" className="m-cat-detail-card" onClick={onClick}>
      <span className="m-cat-detail-card-photo">
        {record.imageData ? (
          <img src={record.imageData} alt={record.coffeeName} />
        ) : (
          <span className="m-cat-detail-card-noimg">{coffee?.name.slice(0, 2) ?? "咖啡"}</span>
        )}
      </span>
      <span className="m-cat-detail-card-body">
        <span className="m-cat-detail-card-name">{record.coffeeName}</span>
        {tags.length > 0 && (
          <span className="m-cat-detail-card-tags">
            {tags.map((tag) => (
              <span key={tag} className="m-cat-detail-card-tag">
                {tag}
              </span>
            ))}
          </span>
        )}
        <span className="m-cat-detail-card-meta">
          <span>{record.volumeMl}ml</span>
          <span className="green">+{record.caffeine}mg</span>
        </span>
        <span className="m-cat-detail-card-comment">“{record.toxicQuote}”</span>
        <span className="m-cat-detail-card-date">{formatDateTime(record.timestamp)}</span>
      </span>
    </button>
  );
}

function MobileDetailPopup({ record, onClose }: { record: CoffeeRecord; onClose: () => void }) {
  const tags = [record.temp, record.sugar].filter(Boolean);

  return (
    <div className="m-detail-popup active" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="m-detail-popup-card">
        <button type="button" className="m-detail-close" onClick={onClose} aria-label="关闭详情">
          <X size={16} />
        </button>
        <div className="m-detail-photo-wrap">
          {record.imageData ? <img src={record.imageData} alt={record.coffeeName} /> : null}
        </div>
        <div className="m-detail-info">
          <div className="m-detail-name">{record.coffeeName}</div>
          {tags.length > 0 && (
            <div className="m-detail-tags">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          <div className="m-detail-meta-row">
            <span className="m-detail-volume">{record.volumeMl}ml</span>
            <span className="m-detail-caffeine">+{record.caffeine}mg</span>
          </div>
          <div className="m-detail-comment">{record.aiComment}</div>
          <div className="m-detail-time">{formatDateTime(record.timestamp)}</div>
        </div>
      </section>
    </div>
  );
}

function ResultCard({
  record,
  onClose,
  onOpenHome,
}: {
  record: CoffeeRecord;
  onClose: () => void;
  onOpenHome: () => void;
}) {
  return (
    <div className="m-toxic-overlay active">
      <section className="m-toxic-card">
        <button type="button" className="m-toxic-close" onClick={onClose} aria-label="关闭回显卡片">
          <X size={16} />
        </button>
        <div className="m-toxic-success">
          <CheckCircle2 size={16} />
          已录入图鉴
        </div>
        <div className="m-toxic-photo-frame">
          {record.imageData && <img src={record.imageData} alt={record.coffeeName} />}
        </div>
        <div className="m-toxic-tag-row">
          <span className="m-toxic-tag">{record.coffeeName}</span>
          <span className="m-toxic-tag">+{record.caffeine}mg</span>
          <span className="m-toxic-tag">{record.volumeMl}ml</span>
        </div>
        <div className="m-toxic-divider" />
        <div className="m-toxic-quote">{record.toxicQuote}</div>
        <div className="m-toxic-comment">{record.aiComment}</div>
        <div className="m-toxic-actions">
          <button type="button" className="m-toxic-secondary-btn" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="m-toxic-replay-btn" onClick={onOpenHome}>
            进入首页
          </button>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => resolve(String(reader.result));
      image.onload = () => {
        const maxWidth = 720;
        const scale = image.width > maxWidth ? maxWidth / image.width : 1;
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          resolve(String(reader.result));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.62));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
