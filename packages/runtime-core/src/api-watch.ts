import {
  ComputedRef,
  DebuggerOptions,
  EffectScheduler,
  ReactiveEffect,
  Ref,
  isReactive,
  isRef,
} from "@ovue/reactivity";
import {
  NOOP,
  hasChanged,
  isArray,
  isFunction,
  isMap,
  isObject,
  isPlainObject,
  isSet,
} from "@ovue/shared";
import { SchedulerJob, queueJob, queuePostFlushCb } from "./scheduler";
import { ReactiveFlags, isShallow } from "packages/reactivity/src/reactive";

export type WatchEffect = (onCleanup: OnCleanup) => void;

type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true
      ? V | undefined
      : V
    : T[K] extends object
    ? Immediate extends true
      ? T[K] | undefined
      : T[K]
    : never;
};

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

type MultiWatchSources = (WatchSource<unknown> | object)[];

// overload: array of multiple sources + cb
export function watch<
  T extends MultiWatchSources,
  Immediate extends Readonly<boolean> = false
>(
  sources: [...T],
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>
): WatchStopHandle;
// overload: multiple sources w/ `as const`
export function watch<
  T extends Readonly<MultiWatchSources>,
  Immediate extends Readonly<boolean> = false
>(
  source: T,
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>
): WatchStopHandle;
// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle;
// overload: watching reactive object w/ cb
export function watch<
  T extends object,
  Immediate extends Readonly<boolean> = false
>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle;
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  return doWatch(source as any, cb, options);
}

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = {}
): WatchStopHandle {
  const instance =
    getCurrentScope() === currentInstance?.scope ? currentInstance : null;

  // 声明getter
  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;

  // 赋值 getter
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => source;
    deep = true;
  } else if (isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive(s) || isShallow(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (isFunction(s)) {
          return s();
        } else {
          console.log("Invalid watch source: ", s);
        }
      });
  } else if (isFunction(source)) {
    if (cb) {
      // TODO
      getter = () => source(undefined as any);
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
    console.log("Invalid watch source: ", source);
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
      const newValue = effect.run();
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue))
      ) {
        if (cleanup) {
          cleanup();
        }
        cb(
          newValue,
          // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE
            ? undefined
            : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
            ? []
            : oldValue,
          onCleanup
        );
        oldValue = newValue;
      }
    } else {
      // watchEffect
      effect.run();
    }
  };

  job.allowRecurse = !!cb;

  let scheduler: EffectScheduler;
  if (flush === "sync") {
    scheduler = job as any;
  } else if (flush === "post") {
    scheduler = () => queuePostFlushCb(job, instance && instance.suspense);
  } else {
    job.pre = true;
    if (instance) job.id = instance.uid;
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

export function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value;
  }
  seen = seen || new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (isRef(value)) {
    traverse(value.value, seen);
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen);
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, seen);
    });
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen);
    }
  }
  return value;
}
