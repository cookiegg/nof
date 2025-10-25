"use client";

export function coinSrc(symbol?: string): string | undefined {
  const k = String(symbol || "").toUpperCase();
  switch (k) {
    case "BTC":
      return "/coins/btc.svg";
    case "ETH":
      return "/coins/eth.svg";
    case "SOL":
      return "/coins/sol.svg";
    case "BNB":
      return "/coins/bnb.svg";
    case "DOGE":
      return "/coins/doge.svg";
    case "XRP":
      return "/coins/xrp.svg";
    default:
      return undefined;
  }
}

export function CoinIcon({
  symbol,
  size = 16,
}: {
  symbol?: string;
  size?: number;
}) {
  const src = coinSrc(symbol);
  if (!src)
    return (
      <span className="inline-block text-[11px]">{String(symbol || "")}</span>
    ) as any;
  const cls = size <= 16 ? "logo-chip logo-chip-sm" : "logo-chip logo-chip-md";
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <span
      className={`${cls} overflow-hidden`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={String(symbol || "")}
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
      />
    </span>
  ) as any;
}

export default CoinIcon;
