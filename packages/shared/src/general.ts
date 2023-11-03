import { makeMap } from "./make-map";

export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === "object";

export const isString = (val: unknown): val is string =>
  typeof val === "string";

export const isSymbol = (val: unknown): val is symbol =>
  typeof val === "symbol";

export const toTypeString = (value: unknown): string =>
  Object.prototype.toString.call(value);

export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};

export const hasChanged = (value: any, oldValue: any): boolean => {
  return !Object.is(value, oldValue);
};

export const hasOwn = (
  val: unknown,
  key: string | symbol
): key is keyof typeof val => {
  return Object.prototype.hasOwnProperty.call(val, key);
};

export const extend = Object.assign;

export const NOOP = () => {};

export const isFunction = (value: unknown): value is Function => {
  return typeof value === "function";
};

export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === "[object Map]";

export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === "[object Set]";

export const isArray = Array.isArray;

export const isIntegerKey = (key: unknown) => {
  return (
    isString(key) &&
    key !== "NaN" &&
    key[0] !== "-" &&
    "" + parseInt(key, 10) === key
  );
};

export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === "[object Object]";

const onRE = /^on[^a-z]/;

export const isOn = (key: string) => onRE.test(key);

export const NO = () => false;

let _globalThis: any;
export const getGlobalThis = (): any => {
  return (
    _globalThis ||
    (_globalThis =
      typeof globalThis !== "undefined"
        ? globalThis
        : typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : {})
  );
};

export const EMPTY_OBJ: { readonly [key: string]: any } = {};
export const EMPTY_ARR = [];

export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg);
  }
};

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return (
    (isObject(val) || isFunction(val)) &&
    isFunction((val as any).then && isFunction((val as any).catch))
  );
};

export const isModelListener = (key: string) => key.startsWith("onUpdate:");

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null);
  return ((str: string) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  }) as T;
};

const hyphenateRE = /\B([A-Z])/g;

export const hyphenate = cacheStringFunction((str: string) =>
  str.replace(hyphenateRE, "-$1").toLowerCase()
);

const camelizeRE = /-(\w)/g;

export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
});

export const isReservedProp = makeMap(
  ",key,ref,ref_for,ref_key," +
    "onVnodeBeforeMount,onVnodeMounted," +
    "onVnodeBeforeUpdate,onVnodeUpdated," +
    "onVnodeBeforeUnmount,onVnodeUnmounted"
);

export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value,
  });
};
