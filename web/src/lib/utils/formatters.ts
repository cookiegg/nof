import { format } from "date-fns";
import numeral from "numeral";

export const fmtUSD = (n?: number | null) =>
  n == null ? "--" : numeral(n).format("$0,0.00");

export const fmtPct = (n?: number | null) =>
  n == null ? "--" : numeral(n).format("0.00%");

export const fmtInt = (n?: number | null) =>
  n == null ? "--" : numeral(n).format("0,0");

export const fmtTs = (unixSeconds?: number | null) =>
  unixSeconds == null
    ? "--"
    : format(unixSeconds * 1000, "yyyy-MM-dd HH:mm:ss");

export const pnlClass = (n?: number | null) =>
  n == null || Number.isNaN(n)
    ? "text-zinc-300"
    : n > 0
      ? "text-green-400"
      : n < 0
        ? "text-red-400"
        : "text-zinc-300";

export const withSign = (n?: number | null, digits = 2) =>
  n == null
    ? "--"
    : `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toFixed(digits)}`;
