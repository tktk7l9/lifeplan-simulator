"use client";

import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useSimulationStore } from "@/store/simulationStore";
import type { SimulationInput } from "@/lib/simulation/types";

/**
 * Writes every form edit to the store as it happens, so jumping to another step
 * (or reloading) never drops what the user typed (SHIG 38, 7, 9).
 * `toPatch` may return null while the values cannot be used yet.
 */
export function useStoreSync<T extends FieldValues>(
  form: UseFormReturn<T>,
  toPatch: (values: T) => Partial<SimulationInput> | null
) {
  const updateInput = useSimulationStore((s) => s.updateInput);
  const toPatchRef = useRef(toPatch);
  useEffect(() => {
    toPatchRef.current = toPatch;
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const patch = toPatchRef.current(values as T);
      if (patch) updateInput(patch);
    });
    return () => subscription.unsubscribe();
  }, [form, updateInput]);
}
