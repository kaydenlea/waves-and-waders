import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

async function getRequestOrigin() {
  const headerList = await headers();
  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : "https";
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

export default async function OpenGraphImage() {
  const origin = await getRequestOrigin();
  const logoUrl = new URL("/logo.png", origin).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "radial-gradient(900px circle at 20% 15%, rgba(34,211,238,0.35), transparent 60%), radial-gradient(900px circle at 75% 10%, rgba(99,102,241,0.25), transparent 60%), linear-gradient(135deg, #0b1220 0%, #071021 60%, #030712 100%)",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(34,211,238,0.35), rgba(99,102,241,0.28))",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <img
                src={logoUrl}
                width={48}
                height={48}
                style={{ borderRadius: 14 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
                Waves and Waders
              </div>
              <div style={{ fontSize: 20, color: "rgba(255,255,255,0.82)" }}>
                Surf forecasts, tides, and beach tools
              </div>
            </div>
          </div>

          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: -2 }}>
            Plan better sessions.
          </div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.82)" }}>
            Live conditions • NOAA-backed data • Interactive maps
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <div>Find your spot • Check the forecast • Go</div>
          <div style={{ opacity: 0.9 }}>wavesandwaders.com</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
