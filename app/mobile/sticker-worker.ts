import { preload, removeBackground } from "@imgly/background-removal";

type StickerWorkerRequest = {
  id: number;
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

const workerGlobal = globalThis as unknown as {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<StickerWorkerRequest>) => void
  ) => void;
  postMessage: (message: StickerWorkerResponse) => void;
};

const configs = new Map<string, {
  model: "isnet_quint8";
  device: "cpu";
  rescale: true;
  publicPath: string;
  fetchArgs: { cache: RequestCache };
  output: { format: "image/png" };
}>();

workerGlobal.addEventListener("message", (event) => {
  void handleRequest(event.data);
});

async function handleRequest(request: StickerWorkerRequest) {
  try {
    const config = getConfig(request.publicPath);

    if (request.type === "preload") {
      await preload(config);
      workerGlobal.postMessage({ id: request.id, ok: true });
      return;
    }

    if (!request.imageData) throw new Error("Sticker source image is missing");

    const blob = await removeBackground(request.imageData, config);
    workerGlobal.postMessage({ id: request.id, ok: true, blob });
  } catch (error) {
    workerGlobal.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "Sticker worker failed",
    });
  }
}

function getConfig(publicPath: string) {
  const existing = configs.get(publicPath);
  if (existing) return existing;

  const config = {
    model: "isnet_quint8",
    device: "cpu",
    rescale: true,
    publicPath,
    fetchArgs: { cache: "force-cache" as RequestCache },
    output: { format: "image/png" },
  } as const;

  configs.set(publicPath, config);
  return config;
}

export {};
