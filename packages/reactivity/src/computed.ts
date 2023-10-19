import { NOOP, isFunction } from "@ovue/shared";
import { DebuggerOptions, ReactiveEffect } from "./effect";
import { ReactiveFlags, toRaw } from "./reactive";
import { Dep } from "./dep";
import { Ref, trackRefValue, triggerRefValue } from "./ref";

declare const ComputedRefSymbol: unique symbol;

export type ComputedGetter<T> = (...args: any[]) => T;
export type ComputedSetter<T> = (v: T) => void;

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>;
}

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T;
  [ComputedRefSymbol]: true;
}

export function computed<T>(
  getter: ComputedGetter<T>,
  debugOptions?: DebuggerOptions
): ComputedRef<T>;
export function computed<T>(
  options: WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions
): WritableComputedRef<T>;
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T>;

  const onlyGetter = isFunction(getterOrOptions);

  if (onlyGetter) {
    getter = getterOrOptions;
    setter = NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  const cRef = new ComputedRefImpl(
    getter,
    setter,
    onlyGetter || !setter,
    isSSR
  );

  return cRef as any;
}

export class ComputedRefImpl<T> {
  public dep?: Dep = undefined;

  private _value!: T;
  public readonly effect: ReactiveEffect<T>;

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false;

  public _dirty = true; // 是否重新计算标记
  public _cacheable: boolean;

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    // 每个 computed 在创建时，会创建 ReactiveEffect，即 computed 值会与依赖的值生成 effect 关系。
    // 然后在 读 computed 值的时候，会进入 get value 方法中，首次获取时 dirty 为 true,会调用当前
    // computed 的 effect 对象的 run 方法进入收集依赖，
    this.effect = new ReactiveEffect(getter, () => {
      // 当前回调是 effect 的 scheduler 函数
      // 只有当 getter 方法所依赖的响应式对象发生变化时才会执行。
      if (!this._dirty) {
        this._dirty = true;
        triggerRefValue(this);
      }
    });
    this.effect.computed = this;
    this.effect.active = this._cacheable = !isSSR;
    this[ReactiveFlags.IS_READONLY] = isReadonly;
  }

  get value() {
    const self = toRaw(this);
    trackRefValue(self);
    if (self._dirty || !self._cacheable) {
      // 需要依赖的值发生变化或者是 SSR 时会重新计算，否则直接返回上一次计算的值
      self._dirty = false; // 计算后会将 dirty 设置为 false，用来缓存当前值
      self._value = self.effect.run()!;
    }
    return self._value;
  }

  set value(newValue: T) {
    this._setter(newValue);
  }
}
