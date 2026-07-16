"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="th">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ fontSize: "3rem" }}>🧺</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>ระบบมีปัญหา</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>ขออภัย ลองใหม่อีกครั้ง</p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            background: "#059669",
            color: "#fff",
            border: 0,
            borderRadius: "9999px",
            padding: "0.6rem 1.4rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ลองใหม่
        </button>
      </body>
    </html>
  );
}
