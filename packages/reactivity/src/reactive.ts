import { isObject, toRawType } from "@ovue/shared";
import { mutableHandlers } from "./base-handlers";
import { Ref, UnwrapRefSimple } from "./ref";

// Reactive对象标记位 在 get 中会拦截返回值
export const enum ReactiveFlags {
  SKIP = "__v_skip",
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = "__v_isShallow",
  RAW = "__v_raw",
}

// 定义未reactive对象
export interface Target {
  [ReactiveFlags.SKIP]?: boolean;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.RAW]?: any;
}

// 缓存已reactived的target
export const reactiveMap = new WeakMap<Target, any>();
// export const shallowReactiveMap = new WeakMap<Target, any>();
// export const readonlyMap = new WeakMap<Target, any>();
// export const shallowReadonlyMap = new WeakMap<Target, any>();

export enum TargetType {
  INVALID = 0, // 不合法 如: number, string
  COMMON = 1, // 普通对象
  COLLECTION = 2, // 可迭代对象- Map Set WeakMap WeakSet
}

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;

/**
 * 将target对象 用 mutableHandlers 等代理
 * @param target
 */
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>;
export function reactive(target: object) {
  // 如果target是readonly对象，直接返回。如： const demo = readonly({});
  // const demo1 = reactive(demo);  console.log(demo === demo1); // true;
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers, // 普通对象如 Object Array 代理处理
    mutableHandlers, // 集合对象如 Map Set WeakMap 处理
    reactiveMap
  );
}

// 具体生成 proxy 对象
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  if (!isObject) return target;

  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const targetType = getTargetType(target);

  if (targetType === TargetType.INVALID) {
    return target;
  }

  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );
  proxyMap.set(target, proxy);
  return proxy;
}

function getTargetType(value: Target): TargetType {
  // 如果 target skip标记位为true 或者 target不可扩展 。则为 INVALID
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

/**
 *  返回原始值
 * @param observed
 * @returns
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

export function toReactive<T extends unknown>(value: T): T {
  return isObject(value) ? reactive(value) : value;
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW]);
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}
