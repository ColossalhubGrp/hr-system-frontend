"use client";

import { QRCodeSVG } from "qrcode.react";

/** Server-component-friendly QR wrapper (qrcode.react is client-only). */
export function QrCode({ value, size = 128 }: { value: string; size?: number }) {
  return <QRCodeSVG value={value} size={size} marginSize={0} />;
}
