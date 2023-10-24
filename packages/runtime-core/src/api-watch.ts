import {
  ComputedRef,
  DebuggerOptions,
  EffectScheduler,
  ReactiveEffect,
  Ref,
  isReactive,
  isRef,
} from "@ovue/reactivity";
import { NOOP, isFunction } from "@ovue/shared";
import { SchedulerJob, queueJob } from "./scheduler";

export type WatchEffect = (onCleanup: OnCleanup) => void;

export type OnCleanup = (cleanupFn: () => void) => void;

export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup
) => any;

export interface WatchOptionsBase extends DebuggerOptions {
  flush?: "pre" | "post" | "sync";
}

export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate;
  deep?: boolean;
}

export type WatchStopHandle = () => void;

const INITIAL_WATCHER_VALUE = {};

export function watchEffect(effect: WatchEffect, options?: WatchOptionsBase) {
  return doWatch(effect, null, options);
}

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = {}
): WatchStopHandle {
  // 声明getter
  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;

  // 赋值 getter
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => source;
  } else if (isFunction(source)) {
    if (cb) {
      // TODO
      getter = NOOP;
    } else {
      // watchEffect getter
      getter = () => {
        if (cleanup) {
          cleanup();
        }

        // TODO
        let res;
        try {
          res = source(onCleanup);
        } catch (err) {
          console.warn("未知错误");
        }
        return res;
      };
    }
  } else {
    getter = NOOP;
  }

  let cleanup: () => void;
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      let res;
      try {
        res = fn();
      } catch (error) {
        console.error(error);
      }
      return res;
    };
  };

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE;

  const job: SchedulerJob = () => {
    if (!effect.active) {
      return;
    }
    if (cb) {
      // watch(source, cb)
      // TODO
    } else {
      // watchEffect
      effect.run();
    }
  };

  job.allowRecurse = !!cb;

  let scheduler: EffectScheduler;
  if (flush === "sync") {
    scheduler = job as any;
  }
  // TODO
  //   else if (flush === "post") {
  //     // scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
  //   }
  else {
    job.pre = true;
    scheduler = () => queueJob(job);
  }

  const effect = new ReactiveEffect(getter, scheduler);
  if (cb) {
    // TODO
  } else if (flush === "post") {
    // TODO
  } else {
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
  };

  // TODO
  return unwatch;
}
