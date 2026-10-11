"use client";

import { lazy, useState, type ComponentType } from "react";

export interface StepProps {
  onNext: () => void;
}

export type LazyStep = ComponentType<StepProps> & { preload: () => Promise<void> };

/**
 * A step whose code is fetched on demand instead of with the first paint. `preload()` fetches it
 * ahead of time (SimulatorApp calls it once the page is idle); a step that mounts after that
 * renders synchronously, so moving to it shows no loading state. A failed fetch is forgotten so
 * the next mount or preload tries again.
 */
export function lazyStep(load: () => Promise<ComponentType<StepProps>>): LazyStep {
  let Loaded: ComponentType<StepProps> | undefined;
  let pending: Promise<void> | undefined;
  const preload = () => {
    pending ??= load().then(
      (component) => {
        Loaded = component;
      },
      (error: unknown) => {
        pending = undefined;
        throw error;
      },
    );
    return pending;
  };
  const Deferred = lazy(() => preload().then(() => ({ default: Loaded! })));
  function Step(props: StepProps) {
    // Decided once per mount: switching from <Deferred> to <Loaded> later would remount the
    // form and drop what the user is typing.
    const [Component] = useState<ComponentType<StepProps>>(() => Loaded ?? Deferred);
    return <Component {...props} />;
  }
  return Object.assign(Step, { preload });
}
