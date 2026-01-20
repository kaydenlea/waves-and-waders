import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 600,
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

export default async function TwitterImage() {
  const origin = await getRequestOrigin();
  const logoUrl = new URL("/icon-512.png", origin).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 18,
          padding: 64,
          background:
            "radial-gradient(900px circle at 20% 15%, rgba(34,211,238,0.34), transparent 60%), radial-gradient(900px circle at 75% 10%, rgba(99,102,241,0.24), transparent 60%), linear-gradient(135deg, #0b1220 0%, #071021 60%, #030712 100%)",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: 26,
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
              width={56}
              height={56}
              style={{ borderRadius: 18 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 56, fontWeight: 850, letterSpacing: -2 }}>
              Waves and Waders
            </div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.82)" }}>
              Surf forecasts • tides • beach tools
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
