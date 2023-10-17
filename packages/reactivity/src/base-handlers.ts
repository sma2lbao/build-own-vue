import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
  isSymbol,
  makeMap,
} from "@ovue/shared";
import {
  ReactiveFlags,
  Target,
  isReactive,
  reactive,
  reactiveMap,
  toRaw,
} from "./reactive";
import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { track, trigger } from "./effect";

const isNonTrackableKeys = makeMap(`__proto__,__v_isRef,__isVue`);

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter((key) => key !== "arguments" && key !== "caller")
    .map((key) => (Symbol as any)[key])
    .filter(isSymbol)
);

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _shallow = false
  ) {}

  /**
   *
   * 获取 reactive 响应式对象的值
   * 以下操作会被拦截
   *  - 访问属性：proxy[foo] 和 proxy.bar
   *  - 访问原型链上的属性：Object.create(proxy)[foo]
   *  - Reflect.get()
   */
  get(target: Target, key: string | symbol, receiver: object) {
    const isReadonly = this._isReadonly,
      shallow = this._shallow;
    // 判断 代理对象 是否 reactive、readonly等的具体逻辑
    if (key === ReactiveFlags.IS_REACTIVE) {
      // isReactive 方法判断逻辑标志位
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      // isReadonly 方法判断逻辑标志位
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow;
    } else if (
      key === ReactiveFlags.RAW &&
      receiver === reactiveMap.get(target)
    ) {
      // 如果调用对象是“target 代理”时，返回被代理的target
      // TODO: readonly 、shallow 代理
      return target;
    }

    const res = Reflect.get(target, key, receiver);
    // 内置的 Symbol或不需要处理的，直接返回
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);
    }

    // target key 的 value 是 object 时，需要再次调用 reactive 来使 value 变成响应式
    if (isObject(res)) {
      return reactive(res);
    }

    return res;
  }
}

// 通用对象基础监听处理
class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(false, shallow);
  }

  /**
   * 以下操作会被拦截
   * - 指定属性值：proxy[foo] = bar 和 proxy.foo = bar
   * - 指定继承者的属性值：Object.create(proxy)[foo] = bar
   * - Reflect.set()
   */
  set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key];

    oldValue = toRaw(oldValue);
    value = toRaw(value);

    // 通过判断是否有 key，来判断是新增还是修改
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }
    return result;
  }

  /**
   *  该方法会拦截以下操作：
   *  - 删除属性：delete proxy[foo] 和 delete proxy.foo
   *  - Reflect.deleteProperty()
   */
  deleteProperty(target: object, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key);
    const oldValue = (target as any)[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
    }
    return result;
  }

  has(target: object, key: string | symbol): boolean {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, TrackOpTypes.HAS, key);
    }
    return result;
  }
}

export const mutableHandlers: ProxyHandler<object> =
  new MutableReactiveHandler();
