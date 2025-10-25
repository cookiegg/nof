"use client";
import Modal from "@/components/ui/Modal";
import { fmtUSD } from "@/lib/utils/formatters";
import type { ExitPlan } from "@/lib/api/types";

export function ExitPlanModal({
  open,
  onClose,
  modelId,
  symbol,
  exitPlan,
}: {
  open: boolean;
  onClose: () => void;
  modelId: string;
  symbol: string;
  exitPlan?: ExitPlan;
}) {
  const hasPlan = !!(
    exitPlan &&
    (exitPlan.profit_target ||
      exitPlan.stop_loss ||
      exitPlan.invalidation_condition)
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`退出计划 • ${modelId} • ${symbol}`}
    >
      {hasPlan ? (
        <div className="space-y-2">
          <div
            className="flex items-center justify-between"
            style={{ color: "var(--muted-text)" }}
          >
            <span>目标价</span>
            <span className="tabular-nums">
              {exitPlan?.profit_target != null
                ? fmtUSD(exitPlan?.profit_target)
                : "—"}
            </span>
          </div>
          <div
            className="flex items-center justify-between"
            style={{ color: "var(--muted-text)" }}
          >
            <span>止损价</span>
            <span className="tabular-nums">
              {exitPlan?.stop_loss != null ? fmtUSD(exitPlan?.stop_loss) : "—"}
            </span>
          </div>
          <div>
            <div className="mb-1" style={{ color: "var(--muted-text)" }}>
              失效条件
            </div>
            <p
              className="whitespace-pre-wrap"
              style={{ color: "var(--foreground)" }}
            >
              {exitPlan?.invalidation_condition || "—"}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--muted-text)" }}>暂无退出计划。</div>
      )}
    </Modal>
  );
}

export default ExitPlanModal;
