import ModelSelectorBar from "@/components/model/ModelSelectorBar";
import ModelsIndexRedirect from "@/components/model/ModelsIndexRedirect";

export default function ModelsIndexPage() {
  return (
    <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-3">
        {/* 顶部仅保留选择条；默认跳转到第一个模型 */}
        <ModelSelectorBar />
        <ModelsIndexRedirect />
        <div
          className="rounded-md border p-3 text-xs"
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--muted-text)" }}
        >
          正在为你选择第一个模型…
        </div>
      </div>
    </main>
  );
}
