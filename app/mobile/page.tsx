"use client";

/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ChevronLeft, QrCode, RefreshCw, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CoffeeRecord,
  CURRENT_STICKER_VERSION,
  coffeeCategories,
  coffeeTypeMap,
  getExactCoffeeMatch,
  getNextToxicQuote,
  searchCoffeeTypes,
} from "@/coffee-data";
import { AuthGate } from "@/app/AuthGate";
import { BrandLogo } from "@/app/BrandLogo";
import { CoffeeCalendar, getLocalDayKey } from "@/app/CoffeeCalendar";
import { useStickerBackfill } from "@/app/use-sticker-backfill";
import { useCoffeeAuth } from "@/use-coffee-auth";
import {
  createSticker,
  preloadStickerEngine,
} from "./sticker";

const tempOptions = ["热", "冰", "常温"];
const sugarOptions = ["无糖", "微甜", "标准", "很甜"];
const quickVolumes = [
  { label: "小杯", ml: 150 },
  { label: "中杯", ml: 240 },
  { label: "大杯", ml: 360 },
  { label: "超大杯", ml: 480 },
];
const NEW_RECORD_STICKER_DELAY_MS = 500;
const RECOGNITION_CLIENT_TIMEOUT_MS = 36_000;

type TimeFilter = "all" | "week" | "month" | "year";

const timeFilterLabels: Record<TimeFilter, string> = {
  all: "全部",
  week: "本周",
  month: "本月",
  year: "本年",
};

interface RecognitionResult {
  isDrink: boolean;
  confidence: number;
  vessel: string | null;
  drinkType: string | null;
  drinkName: string | null;
  reason: string;
  provider: "openai" | "manual";
  allowManualConfirm: boolean;
  failureCode?: string;
}

interface RecordsResponse {
  records: CoffeeRecord[];
  updatedAt: number;
}

export default function MobilePage() {
  const router = useRouter();
  const auth = useCoffeeAuth();
  const {
    isAuthEnabled,
    loading: authLoading,
    user: authUser,
    getAuthHeaders,
    redeemQrLogin,
    signOut,
  } = auth;
  const activeRecordsOwner = authUser?.id ?? (isAuthEnabled ? null : "local");
  const activeRecordsOwnerRef = useRef(activeRecordsOwner);
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
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [screen, setScreen] = useState<"entry" | "home">("entry");
  const [records, setRecords] = useState<CoffeeRecord[]>([]);
  const [loadedRecordsOwner, setLoadedRecordsOwner] = useState<string | null>(null);
  const [surfaceChecked, setSurfaceChecked] = useState(false);
  const [qrLoginPending, setQrLoginPending] = useState(true);
  const photoRequestRef = useRef(0);
  const recognitionRequestRef = useRef(0);
  const recognitionAbortRef = useRef<AbortController | null>(null);
  const refreshRequestRef = useRef(0);
  const qrLoginAttemptedRef = useRef(false);

  const refreshRecords = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;

    if (isAuthEnabled && !authUser) {
      setLoadedRecordsOwner(null);
      setRecords([]);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/records", { cache: "no-store", headers });
      if (requestId !== refreshRequestRef.current) return;

      if (!response.ok) {
        if (response.status === 401) {
          setLoadedRecordsOwner(null);
          setRecords([]);
          setMessage("登录状态已失效，请重新登录。");
          void signOut();
        }
        return;
      }

      const data = (await response.json()) as RecordsResponse;
      if (requestId !== refreshRequestRef.current) return;

      setLoadedRecordsOwner(activeRecordsOwner);
      setRecords((current) => mergeRefreshedRecords(data.records, current));
    } catch {
      if (requestId === refreshRequestRef.current) {
        setMessage("图鉴同步失败，请稍后重试。");
      }
    }
  }, [activeRecordsOwner, authUser, getAuthHeaders, isAuthEnabled, signOut]);

  const selectedCategory = useMemo(
    () => coffeeCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId]
  );
  const selectedCoffee = selectedTypeId ? coffeeTypeMap[selectedTypeId] : null;
  const searchMatches = useMemo(() => searchCoffeeTypes(searchTerm), [searchTerm]);
  const recognitionApproved = Boolean(recognition?.provider === "openai" && recognition.isDrink) || manualConfirmed;
  const canContinueAfterRecognition =
    !recognizing && Boolean(imageData) && recognitionApproved;
  const canSubmit = Boolean(
    canContinueAfterRecognition &&
    selectedCoffee &&
    Number(volumeMl) > 0 &&
    !submitting
  );
  const shouldShowRecognitionCard = Boolean(imageData && recognition && !recognizing);
  const aiDetectedText = recognition ? getRecognitionDetectedText(recognition, manualConfirmed) : "";

  const cancelRecognition = useCallback(() => {
    recognitionRequestRef.current += 1;
    recognitionAbortRef.current?.abort();
    recognitionAbortRef.current = null;
    setRecognizing(false);
  }, []);

  useEffect(() => {
    activeRecordsOwnerRef.current = activeRecordsOwner;
  }, [activeRecordsOwner]);

  useEffect(() => {
    const isPhoneWidth = window.matchMedia("(max-width: 760px)").matches;

    if (!isPhoneWidth) {
      router.replace("/");
      return;
    }

    const checkTimer = window.setTimeout(() => setSurfaceChecked(true), 0);

    return () => window.clearTimeout(checkTimer);
  }, [router]);

  useEffect(() => {
    if (!surfaceChecked || authLoading || qrLoginAttemptedRef.current) return;

    const ticket = new URLSearchParams(window.location.search).get("login");
    qrLoginAttemptedRef.current = true;

    if (!ticket || authUser) {
      if (ticket) window.history.replaceState(null, "", window.location.pathname);
      const readyTimer = window.setTimeout(() => setQrLoginPending(false), 0);
      return () => window.clearTimeout(readyTimer);
    }

    void redeemQrLogin(ticket).then((success) => {
      if (success) window.history.replaceState(null, "", window.location.pathname);
      setQrLoginPending(false);
    });
  }, [authLoading, authUser, redeemQrLogin, surfaceChecked]);

  useEffect(() => {
    if (!message || message.endsWith("...")) return;

    const dismissTimer = window.setTimeout(() => {
      setMessage((current) => current === message ? "" : current);
    }, 2800);

    return () => window.clearTimeout(dismissTimer);
  }, [message]);

  useEffect(() => {
    if (!surfaceChecked) return;

    photoRequestRef.current += 1;
    recognitionRequestRef.current += 1;
    recognitionAbortRef.current?.abort();
    recognitionAbortRef.current = null;
    refreshRequestRef.current += 1;

    const resetTimer = window.setTimeout(() => {
      setLoadedRecordsOwner(null);
      setRecords([]);
      setLastRecord(null);
      setShowResultCard(false);
      setRecognizing(false);
      setRecognition(null);
      setManualConfirmed(false);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [authUser?.id, isAuthEnabled, surfaceChecked]);

  useEffect(() => {
    if (!surfaceChecked || authLoading || (isAuthEnabled && !authUser)) return;

    const refreshTimer = window.setTimeout(() => void refreshRecords(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [authLoading, authUser, isAuthEnabled, refreshRecords, surfaceChecked]);

  const updateBackfilledRecord = useCallback((updatedRecord: CoffeeRecord) => {
    setRecords((current) => current.map((record) => (
      record.id === updatedRecord.id ? updatedRecord : record
    )));
    setLastRecord((current) => current?.id === updatedRecord.id ? updatedRecord : current);
  }, []);

  useStickerBackfill({
    records,
    activeOwner: activeRecordsOwner,
    recordsReady: loadedRecordsOwner === activeRecordsOwner,
    enabled: screen === "home" || (!imageData && !recognizing && !submitting && !showResultCard),
    getAuthHeaders,
    onUnauthorized: signOut,
    onRecordUpdated: updateBackfilledRecord,
  });

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const requestId = ++photoRequestRef.current;
    event.currentTarget.value = "";
    cancelRecognition();
    setMessage("正在压缩照片...");

    try {
      const compressed = await compressImage(file);

      if (requestId !== photoRequestRef.current) return;

      setImageData(compressed);
      setSelectedCategoryId(null);
      setSelectedTypeId(null);
      setSearchTerm("");
      setRecognition(null);
      setManualConfirmed(false);
      setLastRecord(null);
      setShowResultCard(false);
      void recognizeImage(compressed);
      void preloadStickerEngine();
    } catch {
      if (requestId === photoRequestRef.current) {
        setMessage("照片读取失败，请重新选择。");
      }
    }
  };

  const resetForm = () => {
    photoRequestRef.current += 1;
    cancelRecognition();
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
    photoRequestRef.current += 1;
    cancelRecognition();
    setImageData(null);
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSearchTerm("");
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

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
  };

  const confirmSearchTerm = () => {
    if (!canContinueAfterRecognition) return;

    const trimmedTerm = searchTerm.trim();

    if (!trimmedTerm) return;

    const exactMatch = getExactCoffeeMatch(trimmedTerm);

    if (!exactMatch) {
      setMessage("没有精确匹配到分类，可以点下方推荐项。");
      return;
    }

    if (selectedTypeId === exactMatch.coffee.id) return;

    setSelectedCategoryId(exactMatch.category.id);
    setSelectedTypeId(exactMatch.coffee.id);
    setMessage("已根据输入匹配分类。");
  };

  const recognizeImage = async (photoData: string) => {
    const requestId = ++recognitionRequestRef.current;
    recognitionAbortRef.current?.abort();
    const controller = new AbortController();
    recognitionAbortRef.current = controller;
    setRecognizing(true);
    setMessage("");

    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, RECOGNITION_CLIENT_TIMEOUT_MS);

    try {
      const authHeaders = await getAuthHeaders();
      if (requestId !== recognitionRequestRef.current) return;

      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ imageData: photoData }),
        signal: controller.signal,
      });

      const data = (await response.json()) as RecognitionResult | { error?: string };
      if (requestId !== recognitionRequestRef.current) return;

      const errorMessage = "error" in data ? data.error : undefined;

      if (response.status === 401) {
        setMessage(errorMessage ?? "登录状态已失效，请重新登录。");
        void signOut();
        return;
      }

      if (!response.ok || errorMessage) {
        setRecognition(createManualRecognition(errorMessage ?? "AI 识别暂时不可用，请人工确认后继续录入。"));
        setManualConfirmed(false);
        setMessage("");
        return;
      }

      const recognitionData = data as RecognitionResult;

      if (recognitionData.provider === "manual") {
        setRecognition(recognitionData);
        setManualConfirmed(false);
        setMessage("");
        return;
      }

      setRecognition(recognitionData);
      setManualConfirmed(false);
    } catch {
      if (requestId !== recognitionRequestRef.current) return;

      setRecognition(createManualRecognition(
        timedOut
          ? "AI 识别等待超时。你可以重新识别，或人工确认这张照片是饮品。"
          : "手机与识别服务的网络连接中断。请检查网络后重新识别，或人工确认。"
      ));
      setManualConfirmed(false);
      setMessage("");
    } finally {
      window.clearTimeout(timeout);
      if (requestId === recognitionRequestRef.current) {
        recognitionAbortRef.current = null;
        setRecognizing(false);
      }
    }
  };

  const attachStickerToRecord = useCallback(async (
    recordId: string,
    photoData: string,
    recordsOwner: string | null
  ) => {
    try {
      if (activeRecordsOwnerRef.current !== recordsOwner) return;

      const generation = await createSticker(photoData);
      if (!generation.sticker) return;
      if (activeRecordsOwnerRef.current !== recordsOwner) return;

      const authHeaders = await getAuthHeaders();
      if (activeRecordsOwnerRef.current !== recordsOwner) return;

      const response = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          id: recordId,
          stickerData: generation.sticker,
          stickerVersion: CURRENT_STICKER_VERSION,
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as { record: CoffeeRecord };
      if (activeRecordsOwnerRef.current !== recordsOwner) return;

      setRecords((current) => current.map((record) => (
        record.id === data.record.id ? data.record : record
      )));
      setLastRecord((current) => current?.id === data.record.id ? data.record : current);
    } catch (error) {
      console.warn("[Coffee-Dex] Background sticker update failed:", error);
    }
  }, [getAuthHeaders]);

  const refreshToxicQuote = async () => {
    if (!lastRecord || quoteRefreshing) return;

    const recordId = lastRecord.id;
    const previousQuote = lastRecord.toxicQuote;
    const nextQuote = getNextToxicQuote(previousQuote);
    const applyQuote = (quote: string) => {
      setLastRecord((current) => current?.id === recordId ? { ...current, toxicQuote: quote } : current);
      setRecords((current) => current.map((record) => (
        record.id === recordId ? { ...record, toxicQuote: quote } : record
      )));
    };

    setQuoteRefreshing(true);
    applyQuote(nextQuote);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ id: recordId, toxicQuote: nextQuote }),
      });
      const data = await response.json().catch(() => ({ error: "毒鸡汤更新失败，请重试。" })) as {
        error?: string;
      };

      if (response.status === 401) {
        applyQuote(previousQuote);
        setMessage(data.error ?? "登录状态已失效，请重新登录。");
        void signOut();
        return;
      }

      if (!response.ok) {
        applyQuote(previousQuote);
        setMessage(data.error ?? "毒鸡汤更新失败，请重试。");
        return;
      }

      setMessage("已换一条职场冷幽默。");
    } catch {
      applyQuote(previousQuote);
      setMessage("网络异常，毒鸡汤更新失败。");
    } finally {
      setQuoteRefreshing(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !selectedCoffee || !imageData) return;

    const photoData = imageData;
    const recordsOwner = activeRecordsOwner;

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
          imageData: photoData,
          volumeMl: Number(volumeMl),
          temp,
          sugar,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "提交失败，请重试" }));
        if (response.status === 401) {
          setRecords([]);
          void signOut();
        }
        setMessage(error.error ?? "提交失败，请重试");
        return;
      }

      const data = (await response.json()) as { record: CoffeeRecord };
      if (activeRecordsOwnerRef.current !== recordsOwner) return;

      setLoadedRecordsOwner(recordsOwner);
      setLastRecord(data.record);
      setRecords((current) => [data.record, ...current.filter((record) => record.id !== data.record.id)]);
      setShowResultCard(true);
      setMessage("");
      window.setTimeout(() => {
        void attachStickerToRecord(data.record.id, photoData, recordsOwner);
      }, NEW_RECORD_STICKER_DELAY_MS);
    } catch {
      setMessage("网络异常，提交失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const openHome = () => {
    setShowResultCard(false);
    setMessage("");
    setScreen("home");
    void refreshRecords();
  };

  if (!surfaceChecked || qrLoginPending) {
    return (
      <main className="mobile-view">
        <div className="m-ambient" />
        {surfaceChecked && (
          <div className="m-qr-login-loading" role="status" aria-live="polite">
            <QrCode size={30} />
            <strong>正在接入你的咖啡图鉴</strong>
            <span>扫码授权校验中...</span>
          </div>
        )}
      </main>
    );
  }

  if (isAuthEnabled && (authLoading || !authUser)) {
    return <AuthGate auth={auth} surface="mobile" />;
  }

  if (screen === "home") {
    return (
      <MobileHome
        records={records}
        authEmail={authUser?.email ?? null}
        onSignOut={isAuthEnabled ? signOut : undefined}
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
          <div className="m-entry-brand">
            <BrandLogo className="m-entry-brand-logo" sizes="56px" preload />
            <div className="m-entry-brand-copy">
              <h1>Coffee-Dex</h1>
              <p className="sub">记录每一杯，点亮你的图鉴</p>
            </div>
          </div>
          {isAuthEnabled && authUser?.email && (
            <div className="m-entry-account">
              <span>{authUser.email}</span>
              <button type="button" onClick={signOut}>
                退出
              </button>
            </div>
          )}
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
              <div className="m-ai-sub">正在确认是否为饮品，网络较慢时会自动重试</div>
            </div>
          </label>
          <input id="mFileInput" type="file" accept="image/*" onChange={handlePhoto} />
        </section>

        {shouldShowRecognitionCard && recognition && (
          <section className={`m-ai-status-card ${recognitionApproved ? "pass" : "warn"}`}>
            <div className="m-ai-status-title">AI 检测</div>
            <div className="m-ai-status-text">
              {aiDetectedText}
              {recognition.confidence > 0 ? `（置信度 ${Math.round(recognition.confidence * 100)}%）` : ""}
            </div>
            {!recognitionApproved && recognition.allowManualConfirm && (
              <div className="m-ai-status-actions">
                <button
                  type="button"
                  className="m-ai-retry-btn"
                  onClick={() => imageData && void recognizeImage(imageData)}
                >
                  重新识别
                </button>
                <button
                  type="button"
                  className="m-ai-confirm-btn"
                  onClick={() => {
                    setManualConfirmed(true);
                    setMessage("已确认，继续选择饮品类型。");
                  }}
                >
                  确认是饮品
                </button>
              </div>
            )}
          </section>
        )}

        <section className={`m-search-section ${canContinueAfterRecognition ? "show" : ""}`}>
          {selectedCategory && selectedCoffee ? (
            <div className="m-drink-match-card">
              <div>
                <span className="m-drink-match-label">已匹配分类</span>
                <span className="m-drink-match-name">{selectedCategory.name}: {selectedCoffee.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedTypeId(null);
                  setSearchTerm("");
                  setMessage("请重新输入饮品名称。");
                }}
              >
                修改
              </button>
            </div>
          ) : (
            <>
              <div className="m-section-title">输入饮品名称匹配分类</div>
              <div className="m-search-input-wrap">
                <Search className="m-search-icon" size={16} strokeWidth={1.8} />
                <input
                  type="text"
                  className="m-search-input"
                  value={searchTerm}
                  onChange={(event) => updateSearchTerm(event.target.value)}
                  onBlur={confirmSearchTerm}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmSearchTerm();
                    }
                  }}
                  placeholder="例如：葡萄柠檬茶、拿铁、奶茶..."
                />
                <button
                  type="button"
                  className="m-search-confirm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={confirmSearchTerm}
                  disabled={!searchTerm.trim()}
                >
                  确认
                </button>
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
                  <div className="m-search-no-result">未找到匹配的饮品，请从下方手动选择</div>
                )}
              </div>
            </>
          )}
        </section>

        <section className={`m-type-section ${canContinueAfterRecognition && !selectedCoffee ? "show" : ""}`}>
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

        <section className={`m-type-section ${selectedCategory && !selectedCoffee ? "show" : ""}`}>
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
          refreshingQuote={quoteRefreshing}
          onRefreshQuote={refreshToxicQuote}
          onClose={() => {
            setShowResultCard(false);
            resetForm();
          }}
          onOpenHome={openHome}
        />
      )}

      <div className={`m-toast ${message ? "show" : ""}`}>
        {message}
      </div>
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
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
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );
  const selectedDayRecords = useMemo(
    () => selectedDayKey
      ? records
          .filter((record) => getLocalDayKey(new Date(record.timestamp)) === selectedDayKey)
          .sort((a, b) => b.timestamp - a.timestamp)
      : [],
    [records, selectedDayKey]
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
    setSelectedDayKey(null);
    setSelectedCategoryId(categoryId);
    setSelectedSubtype("all");
    setTimeFilter("all");
    setTimeFilterOpen(false);
    setSelectedRecordId(null);
  };

  const openDay = (dayKey: string) => {
    setSelectedCategoryId(null);
    setSelectedDayKey(dayKey);
    setSelectedRecordId(null);
  };

  if (selectedDayKey) {
    return (
      <MobileDayRecords
        dayKey={selectedDayKey}
        records={selectedDayRecords}
        selectedRecord={selectedRecord}
        onBack={() => {
          setSelectedDayKey(null);
          setSelectedRecordId(null);
        }}
        onOpenRecord={(record) => setSelectedRecordId(record.id)}
        onCloseRecord={() => setSelectedRecordId(null)}
      />
    );
  }

  if (selectedCategory) {
    const subtypeRecords = records.filter(
      (record) =>
        record.categoryId === selectedCategory.id &&
        (selectedSubtype === "all" || record.coffeeType === selectedSubtype)
    );
    const visibleRecords = subtypeRecords.filter((record) => matchesTimeFilter(record, timeFilter, now));
    const timeFilterCounts: Record<TimeFilter, number> = {
      all: subtypeRecords.length,
      week: subtypeRecords.filter((record) => matchesTimeFilter(record, "week", now)).length,
      month: subtypeRecords.filter((record) => matchesTimeFilter(record, "month", now)).length,
      year: subtypeRecords.filter((record) => matchesTimeFilter(record, "year", now)).length,
    };

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
                  setTimeFilter("all");
                  setTimeFilterOpen(false);
                  setSelectedRecordId(null);
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
              <button
                type="button"
                className={`m-cat-detail-filter-btn-icon ${timeFilterOpen || timeFilter !== "all" ? "active" : ""}`}
                onClick={() => setTimeFilterOpen((open) => !open)}
                aria-label="筛选"
                aria-expanded={timeFilterOpen}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
            {timeFilterOpen && (
              <div className="m-cat-detail-time-filter" aria-label="时间筛选">
                {(Object.entries(timeFilterLabels) as Array<[TimeFilter, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`m-cat-detail-time-option ${timeFilter === id ? "active" : ""}`}
                    onClick={() => {
                      setTimeFilter(id);
                      setTimeFilterOpen(false);
                    }}
                  >
                    <span>{label}</span>
                    <span>{timeFilterCounts[id]}杯</span>
                  </button>
                ))}
              </div>
            )}
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
                <MobileRecordCard key={record.id} record={record} onClick={() => setSelectedRecordId(record.id)} />
              ))
            ) : (
              <div className="m-cat-detail-empty">这里还没有记录哦</div>
            )}
          </div>
        </div>

        {selectedRecord && <MobileDetailPopup record={selectedRecord} onClose={() => setSelectedRecordId(null)} />}
      </main>
    );
  }

  return (
    <main className="mobile-view">
      <div className="m-home-overlay active">
        <div className="m-home-header-bar">
          <div className="m-home-header-top">
            <div className="m-home-brand">
              <BrandLogo className="m-home-brand-logo" sizes="32px" preload />
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

        <CoffeeCalendar
          records={records}
          compact
          onOpenDay={openDay}
          monthCursor={calendarCursor}
          onMonthCursorChange={setCalendarCursor}
        />

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
          <a className="m-open-source-link" href="/legal/third-party-notices.txt" target="_blank" rel="noreferrer">
            开源许可
          </a>
        </div>
      </div>
      {selectedRecord && <MobileDetailPopup record={selectedRecord} onClose={() => setSelectedRecordId(null)} />}
    </main>
  );
}

function MobileDayRecords({
  dayKey,
  records,
  selectedRecord,
  onBack,
  onOpenRecord,
  onCloseRecord,
}: {
  dayKey: string;
  records: CoffeeRecord[];
  selectedRecord: CoffeeRecord | null;
  onBack: () => void;
  onOpenRecord: (record: CoffeeRecord) => void;
  onCloseRecord: () => void;
}) {
  return (
    <main className="mobile-view">
      <div className="m-cat-detail-overlay active">
        <div className="m-cat-detail-header">
          <div className="m-cat-detail-header-top">
            <button type="button" className="m-cat-detail-back" onClick={onBack} aria-label="返回手机首页">
              <ChevronLeft size={18} />
            </button>
            <div className="m-cat-detail-title-wrap">
              <div className="m-cat-detail-title">{formatDayLabel(dayKey)}</div>
              <div className="m-cat-detail-en">Coffee log</div>
            </div>
            <div className="m-cat-detail-count-inline">{records.length}杯</div>
          </div>
        </div>

        <div className="m-cat-detail-grid">
          {records.length ? (
            records.map((record) => (
              <MobileRecordCard key={record.id} record={record} onClick={() => onOpenRecord(record)} />
            ))
          ) : (
            <div className="m-cat-detail-empty">当天暂无记录</div>
          )}
        </div>
      </div>

      {selectedRecord && <MobileDetailPopup record={selectedRecord} onClose={onCloseRecord} />}
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
        <span className="m-cat-detail-card-comment">“{record.aiComment}”</span>
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
  refreshingQuote,
  onRefreshQuote,
  onClose,
  onOpenHome,
}: {
  record: CoffeeRecord;
  refreshingQuote: boolean;
  onRefreshQuote: () => void;
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
        <div className="m-toxic-quote">
          <button
            type="button"
            className="m-toxic-refresh"
            onClick={onRefreshQuote}
            disabled={refreshingQuote}
            aria-label="换一句毒鸡汤"
            title="换一句"
          >
            <RefreshCw size={13} />
          </button>
          <span>{record.toxicQuote}</span>
        </div>
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

function createManualRecognition(reason: string): RecognitionResult {
  return {
    isDrink: false,
    confidence: 0,
    vessel: null,
    drinkType: null,
    drinkName: null,
    reason,
    provider: "manual",
    allowManualConfirm: true,
  };
}

function getRecognitionDetectedText(recognition: RecognitionResult, manualConfirmed: boolean) {
  if (manualConfirmed) {
    return "已人工确认这张照片里是饮品。";
  }

  if (recognition.provider === "manual") {
    return recognition.reason;
  }

  const detected = [recognition.vessel, recognition.drinkName, recognition.drinkType]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  if (recognition.isDrink) {
    return detected.length ? `AI 检测到图片里有：${detected.join("、")}。` : "AI 检测到图片里有可饮用饮品。";
  }

  return detected.length ? `AI 检测到图片里有：${detected.join("、")}，但未确认是饮品。` : recognition.reason;
}

function matchesTimeFilter(record: CoffeeRecord, filter: TimeFilter, now: number) {
  if (!now) return true;
  if (filter === "week") return record.timestamp >= getWeekStart(now);
  if (filter === "month") return record.timestamp >= getMonthStart(now);
  if (filter === "year") return record.timestamp >= getYearStart(now);
  return true;
}

function getWeekStart(timestamp: number) {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay() || 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek + 1);
  start.setHours(0, 0, 0, 0);

  return start.getTime();
}

function getMonthStart(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function getYearStart(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), 0, 1).getTime();
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(dayKey: string) {
  const [year, monthIndex, day] = dayKey.split("-").map(Number);

  return `${year}年${monthIndex + 1}月${day}日`;
}

function mergeRefreshedRecords(incoming: CoffeeRecord[], current: CoffeeRecord[]) {
  const currentById = new Map(current.map((record) => [record.id, record]));

  return incoming.map((record) => {
    const existing = currentById.get(record.id);

    if (
      existing?.stickerData &&
      (existing.stickerVersion ?? 0) >= CURRENT_STICKER_VERSION &&
      (
        !record.stickerData ||
        (record.stickerVersion ?? 0) < (existing.stickerVersion ?? 0)
      )
    ) {
      return {
        ...record,
        stickerData: existing.stickerData,
        stickerVersion: existing.stickerVersion,
      };
    }

    return record;
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
