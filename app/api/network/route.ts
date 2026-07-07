import { NextRequest, NextResponse } from "next/server";
import os from "os";

export const runtime = "nodejs";

function getLanIps() {
  const ips: string[] = [];

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        ips.push(address.address);
      }
    }
  }

  return ips;
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const lanIps = getLanIps();
  const hostName = host.split(":")[0];
  const isLocalHost = hostName === "localhost" || hostName === "127.0.0.1";
  const isLanHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|198\.18\.)/.test(hostName);
  const isLocalNetwork = isLocalHost || isLanHost;
  const reachableHost = isLocalHost ? lanIps[0] ?? hostName : hostName;
  const protocol = isLocalNetwork ? "http" : forwardedProto ?? "https";
  const port = host.split(":")[1];
  const portPart = isLocalNetwork && port ? `:${port}` : "";

  return NextResponse.json({
    host,
    lanIps,
    mobileUrl: `${protocol}://${reachableHost}${portPart}/mobile`,
  });
}
