"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LifeEvent, LifeEventType } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

const EVENT_TYPE_OPTIONS: { value: LifeEventType; label: string; icon: string }[] =
  [
    { value: "wedding", label: "結婚式", icon: "💍" },
    { value: "car", label: "マイカー購入", icon: "🚗" },
    { value: "travel", label: "旅行", icon: "✈️" },
    { value: "baby", label: "出産費用", icon: "👶" },
    { value: "caregiving", label: "介護費用", icon: "🏥" },
    { value: "other", label: "その他", icon: "📝" },
  ];

function getEventIcon(type: LifeEventType): string {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? "📝";
}

function getEventLabel(type: LifeEventType): string {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "その他";
}

export function LifeEventsStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();
  const [events, setEvents] = useState<LifeEvent[]>(
    input.lifeEvents ?? [
      {
        id: "default-wedding",
        type: "wedding",
        age: 32,
        cost: 300,
        label: "結婚式",
      },
      {
        id: "default-car",
        type: "car",
        age: 35,
        cost: 300,
        label: "マイカー購入",
      },
    ]
  );

  function addEvent() {
    const newEvent: LifeEvent = {
      id: `event-${Date.now()}`,
      type: "other",
      age: (input.age ?? 30) + 5,
      cost: 100,
      label: "その他",
    };
    setEvents((prev) => [...prev, newEvent]);
  }

  function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEvent(id: string, patch: Partial<LifeEvent>) {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...patch };
        // Auto-update label when type changes (only if label matches current type label)
        if (patch.type && updated.label === getEventLabel(e.type)) {
          updated.label = getEventLabel(patch.type);
        }
        return updated;
      })
    );
  }

  function handleNext() {
    updateInput({ lifeEvents: events });
    onNext();
  }

  const totalCost = events.reduce((sum, e) => sum + e.cost, 0);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        結婚・車購入・旅行など、将来発生するまとまった支出を追加してください。
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-medium">ライフイベントがありません</div>
          <div className="text-sm mt-1">下のボタンからイベントを追加してください</div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      イベント {index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        種類
                      </label>
                      <Select
                        value={event.type}
                        onValueChange={(v) =>
                          updateEvent(event.id, { type: v as LifeEventType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        ラベル（メモ）
                      </label>
                      <Input
                        value={event.label}
                        onChange={(e) =>
                          updateEvent(event.id, { label: e.target.value })
                        }
                        placeholder="例: 欧州旅行"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        発生時の年齢
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={event.age}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              age: Number(e.target.value),
                            })
                          }
                          min={18}
                          max={100}
                          className="font-semibold"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">
                          歳
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        費用
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={event.cost}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              cost: Number(e.target.value),
                            })
                          }
                          min={0}
                          className="font-semibold"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">
                          万円
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeEvent(event.id)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addEvent}
        className="w-full rounded-xl border-2 border-dashed border-amber-300 p-4 text-amber-600 font-medium text-sm hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        イベントを追加
      </button>

      {events.length > 0 && (
        <div className="rounded-xl bg-slate-50 border border-border p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">
              ライフイベント合計費用
            </span>
            <span className="text-xl font-bold text-amber-600">
              {totalCost.toLocaleString("ja-JP")}万円
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {events
              .slice()
              .sort((a, b) => a.age - b.age)
              .map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between text-sm text-muted-foreground"
                >
                  <span>
                    {e.age}歳: {e.label}
                  </span>
                  <span>{e.cost.toLocaleString("ja-JP")}万円</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleNext}
        className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-base"
      >
        次へ進む
      </Button>
    </div>
  );
}
