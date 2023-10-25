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
