const MAX_WORK_SIDE = 1024;
const MAX_OUTPUT_SIDE = 512;
const MAX_SUBJECT_SIDE = 440;
const ALPHA_THRESHOLD = 20;
const COMPONENT_ALPHA_THRESHOLD = 48;
const MIN_COMPONENT_PIXELS = 6;
const DETACHED_COMPONENT_RATIO = 0.06;
const NEARBY_COMPONENT_RATIO = 0.001;
const NEARBY_COMPONENT_GAP_RATIO = 0.12;
const DETACHED_COMPONENT_GAP_RATIO = 0.6;
const FULL_FRAME_COVERAGE = 0.995;
const NEAR_FULL_FRAME_COVERAGE = 0.98;
const FULL_EDGE_COVERAGE = 0.9;
const SOLID_FRAME_BOUNDS_RATIO = 0.92;
const SOLID_BOUNDS_COVERAGE = 0.97;
const EDGE_GUARD = 3;
const WEAK_ALPHA_GUARD = 3;
const STICKER_WORKER_TIMEOUT_MS = 240_000;
const STICKER_GENERATION_ATTEMPTS = 2;
const STICKER_RETRY_DELAY_MS = 2_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

type StickerPriority = "interactive" | "background";
export type StickerGenerationResult = {
  sticker: string | null;
  retryable: boolean;
};

type StickerJob = {
  imageData: string;
  priority: StickerPriority;
  resolve: (result: StickerGenerationResult) => void;
  settled: boolean;
};

type StickerWorkerRequest = {
  type: "preload" | "remove";
  publicPath: string;
  imageData?: string;
};

type StickerWorkerResponse = {
  id: number;
  ok: boolean;
  blob?: Blob;
  error?: string;
};

type PendingWorkerRequest = {
  resolve: (blob: Blob | null) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

const interactiveQueue: StickerJob[] = [];
const backgroundQueue: StickerJob[] = [];
let activeStickerJob: StickerJob | null = null;
let stickerPreload: { token: object; promise: Promise<void> } | null = null;
let stickerWorker: Worker | null = null;
let stickerWorkerRequestId = 0;
let stickerWorkerUnavailable = false;
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>();

export function preloadStickerEngine() {
  if (!stickerPreload) {
    const token = {};
    const promise = preloadEngine()
      .catch((error) => {
        if (stickerPreload?.token === token) stickerPreload = null;
        console.warn("[Coffee-Dex] Sticker engine preload failed:", error);
      });

    stickerPreload = { token, promise };
  }

  return stickerPreload.promise;
}

export function resetStickerEngine() {
  for (const queue of [interactiveQueue, backgroundQueue]) {
    for (const job of queue.splice(0)) settleStickerJob(job, retryableFailure());
  }

  if (activeStickerJob) settleStickerJob(activeStickerJob, retryableFailure());
  activeStickerJob = null;
  stickerPreload = null;
  disposeStickerWorker(new Error("Sticker engine reset"));
}

export function createSticker(
  imageData: string,
  priority: StickerPriority = "interactive"
): Promise<StickerGenerationResult> {
  return new Promise((resolve) => {
    const queue = priority === "interactive" ? interactiveQueue : backgroundQueue;

    const job: StickerJob = {
      imageData,
      priority,
      resolve,
      settled: false,
    };

    queue.push(job);

    if (priority === "interactive") preemptBackgroundJob();
    void processStickerQueue();
  });
}

export function isStickerQueueIdle() {
  return !activeStickerJob && !hasPendingJobs();
}

function processStickerQueue() {
  if (activeStickerJob) return;

  const job = takeNextJob();
  if (!job) return;

  activeStickerJob = job;

  void runStickerJob(job)
    .catch((error) => {
      console.warn("[Coffee-Dex] Sticker queue failed:", error);
      settleStickerJob(job, retryableFailure());
    })
    .finally(() => {
      if (activeStickerJob === job) activeStickerJob = null;
      processStickerQueue();
    });
}

async function runStickerJob(job: StickerJob) {
  let generation = retryableFailure();

  for (
    let attempt = 0;
    attempt < STICKER_GENERATION_ATTEMPTS && !generation.sticker && !job.settled;
    attempt += 1
  ) {
    generation = await generateSticker(job.imageData);

    if (
      !generation.sticker &&
      generation.retryable &&
      !job.settled &&
      attempt + 1 < STICKER_GENERATION_ATTEMPTS
    ) {
      await wait(STICKER_RETRY_DELAY_MS);
    } else if (!generation.retryable) {
      break;
    }
  }

  settleStickerJob(job, generation);
}

function settleStickerJob(job: StickerJob, result: StickerGenerationResult) {
  if (job.settled) return;

  job.settled = true;
  job.resolve(result);
}

function takeNextJob() {
  let job = interactiveQueue.shift() ?? backgroundQueue.shift();

  while (job?.settled) job = interactiveQueue.shift() ?? backgroundQueue.shift();

  return job;
}

function hasPendingJobs() {
  return interactiveQueue.some((job) => !job.settled) || backgroundQueue.some((job) => !job.settled);
}

function preemptBackgroundJob() {
  const interrupted = activeStickerJob;
  if (!interrupted || interrupted.priority !== "background") return;

  settleStickerJob(interrupted, retryableFailure());
  disposeStickerWorker(new Error("Sticker background job preempted"));
}

async function generateSticker(imageData: string): Promise<StickerGenerationResult> {
  if (!canUseStickerWorker()) return terminalFailure();

  let blob: Blob;

  try {
    blob = await removeBackgroundInWorker(imageData);
  } catch (error) {
    const incompatible = stickerWorkerUnavailable || isWorkerCompatibilityError(error);

    if (incompatible) {
      stickerWorkerUnavailable = true;
    }
    disposeStickerWorker(error instanceof Error ? error : new Error(String(error)));

    console.warn("[Coffee-Dex] Sticker background removal failed:", error);
    return incompatible ? terminalFailure() : retryableFailure();
  }

  try {
    return { sticker: await renderSticker(blob), retryable: false };
  } catch (error) {
    console.warn("[Coffee-Dex] Sticker rendering failed:", error);
    return { sticker: null, retryable: false };
  }
}

async function preloadEngine() {
  if (!canUseStickerWorker()) return;

  try {
    await requestStickerWorker({
      type: "preload",
      publicPath: getStickerPublicPath(),
    });
  } catch (error) {
    if (stickerWorkerUnavailable || isWorkerCompatibilityError(error)) {
      stickerWorkerUnavailable = true;
    }
    disposeStickerWorker(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function removeBackgroundInWorker(imageData: string) {
  const blob = await requestStickerWorker({
    type: "remove",
    publicPath: getStickerPublicPath(),
    imageData,
  });

  if (!blob) throw new Error("Sticker worker returned no image");
  return blob;
}

function requestStickerWorker(request: StickerWorkerRequest) {
  const worker = getStickerWorker();
  const id = ++stickerWorkerRequestId;

  return new Promise<Blob | null>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      disposeStickerWorker(new Error("Sticker worker timed out"));
    }, STICKER_WORKER_TIMEOUT_MS);

    pendingWorkerRequests.set(id, { resolve, reject, timeoutId });
    worker.postMessage({ id, ...request });
  });
}

function getStickerWorker() {
  if (stickerWorker) return stickerWorker;

  let worker: Worker;

  try {
    worker = new Worker(new URL("./sticker-worker.ts", import.meta.url), {
      type: "module",
      name: "coffee-dex-sticker",
    });
  } catch (error) {
    stickerWorkerUnavailable = true;
    throw error;
  }

  worker.onmessage = (event: MessageEvent<StickerWorkerResponse>) => {
    const pending = pendingWorkerRequests.get(event.data.id);
    if (!pending) return;

    window.clearTimeout(pending.timeoutId);
    pendingWorkerRequests.delete(event.data.id);

    if (event.data.ok) {
      pending.resolve(event.data.blob ?? null);
    } else {
      pending.reject(new Error(event.data.error ?? "Sticker worker failed"));
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    stickerWorkerUnavailable = true;
    disposeStickerWorker(new Error(event.message || "Sticker worker crashed"));
  };
  stickerWorker = worker;
  return worker;
}

function disposeStickerWorker(error: Error) {
  stickerWorker?.terminate();
  stickerWorker = null;
  stickerPreload = null;

  for (const pending of pendingWorkerRequests.values()) {
    window.clearTimeout(pending.timeoutId);
    pending.reject(error);
  }
  pendingWorkerRequests.clear();
}

function canUseStickerWorker() {
  return !stickerWorkerUnavailable &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function";
}

export function canGenerateStickerInBackground() {
  return canUseStickerWorker();
}

function isWorkerCompatibilityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /OffscreenCanvas|createImageBitmap|ImageData|document is not defined/i.test(message);
}

function getStickerPublicPath() {
  return new URL("/background-removal-1.7.0/", window.location.href).toString();
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));
}

function retryableFailure(): StickerGenerationResult {
  return { sticker: null, retryable: true };
}

function terminalFailure(): StickerGenerationResult {
  return { sticker: null, retryable: false };
}

async function renderSticker(blob: Blob): Promise<string> {
  const decoded = await decodeImage(blob);

  try {
    const workScale = Math.min(1, MAX_WORK_SIDE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * workScale));
    const height = Math.max(1, Math.round(decoded.height * workScale));
    const source = createCanvas(width, height);
    const sourceContext = source.getContext("2d", { willReadFrequently: true });

    if (!sourceContext) throw new Error("Canvas is unavailable");

    sourceContext.imageSmoothingEnabled = true;
    sourceContext.imageSmoothingQuality = "high";
    sourceContext.drawImage(decoded.source, 0, 0, width, height);

    const sourcePixels = sourceContext.getImageData(0, 0, width, height);
    const alphaBounds = findAlphaBounds(sourcePixels);
    if (!alphaBounds) throw new Error("Sticker cutout is empty");
    if (alphaBounds.isLikelyFullFrame) {
      throw new Error("Sticker cutout still contains the full image background");
    }
    sourceContext.putImageData(sourcePixels, 0, 0);

    const bounds = {
      left: Math.max(0, alphaBounds.left - EDGE_GUARD),
      top: Math.max(0, alphaBounds.top - EDGE_GUARD),
      right: Math.min(width - 1, alphaBounds.right + EDGE_GUARD),
      bottom: Math.min(height - 1, alphaBounds.bottom + EDGE_GUARD),
    };

    const cropWidth = bounds.right - bounds.left + 1;
    const cropHeight = bounds.bottom - bounds.top + 1;
    const subjectScale = Math.min(1, MAX_SUBJECT_SIDE / Math.max(cropWidth, cropHeight));
    const subjectWidth = Math.max(1, Math.round(cropWidth * subjectScale));
    const subjectHeight = Math.max(1, Math.round(cropHeight * subjectScale));
    const subjectSide = Math.max(subjectWidth, subjectHeight);
    const outline = clamp(Math.round(subjectSide * 0.052), 6, 24);
    const padding = clamp(Math.round(subjectSide * 0.018), 2, 8);
    const inset = outline + padding;
    const output = createCanvas(subjectWidth + inset * 2, subjectHeight + inset * 2);
    const outputContext = output.getContext("2d");

    if (!outputContext) throw new Error("Canvas is unavailable");

    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";

    const drawSubject = (x: number, y: number) => {
      outputContext.drawImage(
        source,
        bounds.left,
        bounds.top,
        cropWidth,
        cropHeight,
        x,
        y,
        subjectWidth,
        subjectHeight
      );
    };

    // Expand the alpha mask in rings, color it white, then restore the subject.
    drawSubject(inset, inset);
    for (let radius = Math.max(1, outline / 3); radius <= outline; radius += Math.max(1, outline / 3)) {
      const samples = Math.max(16, Math.ceil(Math.PI * 2 * radius));
      for (let index = 0; index < samples; index += 1) {
        const angle = (index / samples) * Math.PI * 2;
        drawSubject(inset + Math.cos(angle) * radius, inset + Math.sin(angle) * radius);
      }
    }

    outputContext.globalCompositeOperation = "source-in";
    outputContext.fillStyle = "#ffffff";
    outputContext.fillRect(0, 0, output.width, output.height);
    outputContext.globalCompositeOperation = "source-over";
    drawSubject(inset, inset);

    if (Math.max(output.width, output.height) > MAX_OUTPUT_SIDE) {
      throw new Error("Sticker output exceeded the size limit");
    }

    return output.toDataURL("image/png");
  } finally {
    decoded.dispose();
  }
}

function findAlphaBounds(imageData: ImageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const labels = new Uint32Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  const components: Array<{
    label: number;
    pixels: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
  }> = [];
  let foregroundPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;

      if (data[pixelIndex + 3] <= ALPHA_THRESHOLD) {
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 0;
        continue;
      }

      foregroundPixels += 1;
    }
  }

  if (!foregroundPixels) return null;

  let nextLabel = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (
      labels[start] ||
      data[start * 4 + 3] <= COMPONENT_ALPHA_THRESHOLD
    ) {
      continue;
    }

    const label = ++nextLabel;
    let head = 0;
    let tail = 0;
    let componentPixels = 0;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;

    labels[start] = label;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const pixel = queue[head];
      head += 1;
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;

      componentPixels += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);

      const minY = Math.max(0, y - 1);
      const maxY = Math.min(height - 1, y + 1);
      const minX = Math.max(0, x - 1);
      const maxX = Math.min(width - 1, x + 1);

      for (let nextY = minY; nextY <= maxY; nextY += 1) {
        for (let nextX = minX; nextX <= maxX; nextX += 1) {
          const next = nextY * width + nextX;
          if (
            labels[next] ||
            data[next * 4 + 3] <= COMPONENT_ALPHA_THRESHOLD
          ) {
            continue;
          }

          labels[next] = label;
          queue[tail] = next;
          tail += 1;
        }
      }
    }

    if (componentPixels >= MIN_COMPONENT_PIXELS) {
      components.push({
        label,
        pixels: componentPixels,
        left,
        top,
        right,
        bottom,
      });
    }
  }

  const sorted = components.slice().sort((a, b) => b.pixels - a.pixels);
  const primary = sorted[0];
  if (!primary) return null;

  const retainedLabels = new Uint8Array(nextLabel + 1);
  retainedLabels[primary.label] = 1;
  const bounds = {
    left: primary.left,
    top: primary.top,
    right: primary.right,
    bottom: primary.bottom,
  };
  const primarySide = Math.max(
    primary.right - primary.left + 1,
    primary.bottom - primary.top + 1
  );
  const detachedThreshold = Math.max(
    12,
    Math.round(primary.pixels * DETACHED_COMPONENT_RATIO)
  );
  const nearbyThreshold = Math.max(
    6,
    Math.round(primary.pixels * NEARBY_COMPONENT_RATIO)
  );
  const nearbyGap = Math.max(
    8,
    Math.round(primarySide * NEARBY_COMPONENT_GAP_RATIO)
  );
  const detachedGap = Math.max(
    nearbyGap,
    Math.round(primarySide * DETACHED_COMPONENT_GAP_RATIO)
  );

  for (const component of sorted.slice(1)) {
    const gapFromPrimary = getBoundsGap(component, primary);
    const retain =
      (component.pixels >= detachedThreshold &&
        gapFromPrimary <= detachedGap) ||
      (component.pixels >= nearbyThreshold &&
        gapFromPrimary <= nearbyGap);

    if (!retain) continue;

    retainedLabels[component.label] = 1;
    bounds.left = Math.min(bounds.left, component.left);
    bounds.top = Math.min(bounds.top, component.top);
    bounds.right = Math.max(bounds.right, component.right);
    bounds.bottom = Math.max(bounds.bottom, component.bottom);
  }

  // Keep soft antialiasing only when it is connected and close to a retained core.
  const retainedAlpha = new Uint8Array(pixelCount);
  let retainedHead = 0;
  let retainedTail = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!labels[pixel] || !retainedLabels[labels[pixel]]) continue;

    retainedAlpha[pixel] = 1;
    queue[retainedTail] = pixel;
    retainedTail += 1;
  }

  while (retainedHead < retainedTail) {
    const pixel = queue[retainedHead];
    retainedHead += 1;
    const distance = retainedAlpha[pixel];
    if (distance > WEAK_ALPHA_GUARD) continue;

    const y = Math.floor(pixel / width);
    const x = pixel - y * width;
    const minY = Math.max(0, y - 1);
    const maxY = Math.min(height - 1, y + 1);
    const minX = Math.max(0, x - 1);
    const maxX = Math.min(width - 1, x + 1);

    for (let nextY = minY; nextY <= maxY; nextY += 1) {
      for (let nextX = minX; nextX <= maxX; nextX += 1) {
        const next = nextY * width + nextX;
        const nextLabel = labels[next];

        if (
          retainedAlpha[next] ||
          data[next * 4 + 3] <= ALPHA_THRESHOLD ||
          (nextLabel && !retainedLabels[nextLabel])
        ) {
          continue;
        }

        retainedAlpha[next] = distance + 1;
        queue[retainedTail] = next;
        retainedTail += 1;
      }
    }
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (retainedAlpha[pixel]) continue;

    const pixelIndex = pixel * 4;
    data[pixelIndex] = 0;
    data[pixelIndex + 1] = 0;
    data[pixelIndex + 2] = 0;
    data[pixelIndex + 3] = 0;
  }

  let retainedForegroundPixels = 0;
  let topEdgePixels = 0;
  let rightEdgePixels = 0;
  let bottomEdgePixels = 0;
  let leftEdgePixels = 0;

  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;

      retainedForegroundPixels += 1;
      if (y === 0) topEdgePixels += 1;
      if (x === width - 1) rightEdgePixels += 1;
      if (y === height - 1) bottomEdgePixels += 1;
      if (x === 0) leftEdgePixels += 1;
    }
  }

  const boundsWidth = bounds.right - bounds.left + 1;
  const boundsHeight = bounds.bottom - bounds.top + 1;
  const coverage = retainedForegroundPixels / pixelCount;
  const boundsCoverage = retainedForegroundPixels / (boundsWidth * boundsHeight);
  const allEdgesFilled =
    topEdgePixels / width > FULL_EDGE_COVERAGE &&
    rightEdgePixels / height > FULL_EDGE_COVERAGE &&
    bottomEdgePixels / width > FULL_EDGE_COVERAGE &&
    leftEdgePixels / height > FULL_EDGE_COVERAGE;

  return {
    ...bounds,
    isLikelyFullFrame:
      coverage > FULL_FRAME_COVERAGE ||
      (coverage > NEAR_FULL_FRAME_COVERAGE && allEdgesFilled) ||
      (boundsWidth / width > SOLID_FRAME_BOUNDS_RATIO &&
        boundsHeight / height > SOLID_FRAME_BOUNDS_RATIO &&
        boundsCoverage > SOLID_BOUNDS_COVERAGE),
  };
}

function getBoundsGap(
  candidate: { left: number; top: number; right: number; bottom: number },
  current: { left: number; top: number; right: number; bottom: number }
) {
  const horizontal = Math.max(
    0,
    candidate.left - current.right - 1,
    current.left - candidate.right - 1
  );
  const vertical = Math.max(
    0,
    candidate.top - current.bottom - 1,
    current.top - candidate.bottom - 1
  );

  return Math.hypot(horizontal, vertical);
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Safari can expose createImageBitmap but fail to decode some PNG blobs.
    }
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Sticker image decode failed"));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(url),
  };
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
