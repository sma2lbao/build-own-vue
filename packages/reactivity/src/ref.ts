import { hasChanged } from "@ovue/shared";
import { isReadonly, isShallow, toRaw, toReactive } from "./reactive";
import {
  activeEffect,
  shouldTrack,
  trackEffects,
  triggerEffects,
} from "./effect";
import { Dep, createDep } from "./dep";

declare const RefSymbol: unique symbol;
export declare const RawSymbol: unique symbol;

export interface Ref<T = any> {
  value: T;
  [RefSymbol]: true; // 仅用做类型区分
}
declare const ShallowRefMarker: unique symbol;
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true };

type RefBase<T> = {
  dep?: Dep;
  value: T;
};

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true);
}

export type UnwrapRef<T> = T extends ShallowRef<infer V>
  ? V
  : T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>;

// TODO
export type UnwrapRefSimple<T> = T extends
  | Function
  | Ref
  | { [RawSymbol]?: true }
  ? T
  : T;

export function ref<T extends Ref>(value: T): T;
export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;
export function ref(value?: unknown) {
  return createRef(value, false);
}

function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;

  public readonly __v_isRef = true;

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }

  get value() {
    return this._value;
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = useDirectValue ? newVal : toReactive(newVal);
    }
  }
}

export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ref = toRaw(ref);
  const dep = ref.dep;
  if (dep) {
    triggerEffects(dep);
  }
}

export function trackRefValue(ref: RefBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref);
    trackEffects(ref.dep || (ref.dep = createDep()));
  }
}
