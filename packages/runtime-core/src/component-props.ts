import {
  EMPTY_OBJ,
  PatchFlags,
  camelize,
  def,
  hasOwn,
  hyphenate,
  isFunction,
  isReservedProp,
} from "@ovue/shared";
import {
  ComponentInternalInstance,
  Data,
  setCurrentInstance,
  unsetCurrentInstance,
} from "./component";
import { TriggerOpTypes, toRaw, trigger } from "@ovue/reactivity";
import { isEmitListener } from "./component-emits";
import { InternalObjectKey } from "./vnode";

const enum BooleanFlags {
  shouldCast,
  shouldCastTrue,
}

type NormalizedProp =
  | null
  | (PropOptions & {
      [key: string]: boolean;
    });

export type NormalizedProps = Record<string, NormalizedProp>;

export type ComponentPropsOptions<P = Data> =
  | ComponentObjectPropsOptions<P>
  | string[];

export type ComponentObjectPropsOptions<P = Data> = {
  [K in keyof P]: Prop<P[K]> | null;
};

export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

type DefaultFactory<T> = (props: Data) => T | null | undefined;

export interface PropOptions<T = any, D = T> {
  type?: PropType<T> | true | null;
  required?: boolean;
  default?: D | DefaultFactory<T> | null | undefined | object;
  validator?(value: unknown): boolean;

  skipCheck?: boolean;

  skipFactory?: boolean;
}

export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

type PropConstructor<T = any> =
  | { new (...args: any[]): T & {} }
  | { (): T }
  | PropMethod<T>;

type PropMethod<T, TConstructor = any> = [T] extends [
  ((...args: any) => any) | undefined
]
  ? { new (): TConstructor; (): T; readonly prototype: TConstructor }
  : never;

function resolvePropValue(
  options: NormalizedProps,
  props: Data,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance,
  isAbsent: boolean
) {
  const opt = options[key];
  if (opt != null) {
    const hasDefault = hasOwn(opt, "default");
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default;
      if (
        opt.type !== Function &&
        !opt.skipFactory &&
        isFunction(defaultValue)
      ) {
        const { propsDefaults } = instance;
        if (key in propsDefaults) {
          value = propsDefaults[key];
        } else {
          setCurrentInstance(instance);
          value = propsDefaults[key] = defaultValue.call(null);
          unsetCurrentInstance();
        }
      } else {
        value = defaultValue;
      }
    }

    if (opt[BooleanFlags.shouldCast]) {
      if (isAbsent && !hasDefault) {
        value = false;
      } else if (
        opt[BooleanFlags.shouldCastTrue] &&
        (value === "" || value === hyphenate(key))
      ) {
        value = true;
      }
    }
  }
  return value;
}

export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number,
  isSSR = false
) {
  const props: Data = {};
  const attrs: Data = {};

  def(attrs, InternalObjectKey, 1);

  instance.propsDefaults = Object.create(null);

  setFullProps(instance, rawProps, props, attrs);

  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined;
    }
  }

  if (isStateful) {
    // instance.props = shallowReactive(props);
    console.log("未实现shallow-reactive");
  } else {
    if (!instance.type.props) {
      instance.props = attrs;
    } else {
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}

export function updateProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  rawPrevProps: Data | null,
  optimized: boolean
) {
  const {
    props,
    attrs,
    vnode: { patchFlag },
  } = instance;

  const rawCurrentProps = toRaw(props);
  const [options] = instance.propsOptions;
  let hasAttrsChanged = false;

  if ((optimized || patchFlag > 0) && !(patchFlag & PatchFlags.FULL_PROPS)) {
    if (patchFlag & PatchFlags.PROPS) {
      const propsToUpdate = instance.vnode.dynamicProps!;
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i];

        if (isEmitListener(instance.emitsOptions, key)) {
          continue;
        }

        const value = rawProps![key];
        if (options) {
          if (hasOwn(attrs, key)) {
            attrs[key] = value;
            hasAttrsChanged = true;
          } else {
            const camelizedKey = camelize(key);
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false
            );
          }
        } else {
          if (value !== attrs[key]) {
            attrs[key] = value;
            hasAttrsChanged = true;
          }
        }
      }
    }
  } else {
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true;
    }

    let kebabKey: string;
    for (const key in rawCurrentProps) {
      if (
        !rawProps ||
        !rawProps ||
        (!hasOwn(rawProps, key) &&
          ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))
      ) {
        if (options) {
          if (
            rawPrevProps &&
            (rawPrevProps[key] !== undefined ||
              rawPrevProps[kebabKey!] !== undefined)
          ) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              undefined,
              instance,
              true
            );
          }
        } else {
          delete props[key];
        }
      }
    }

    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (!rawProps || !hasOwn(rawProps, key)) {
          delete attrs[key];
          hasAttrsChanged = true;
        }
      }
    }
  }

  if (hasAttrsChanged) {
    trigger(instance, TriggerOpTypes.SET, "$attrs");
  }
}

function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions;
  let hasAttrsChanged = false;
  let rawCastValues: Data | undefined;
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedProp(key)) {
        continue;
      }

      const value = rawProps[key];

      let camelKey;
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value;
        } else {
          (rawCastValues || (rawCastValues = {}))[camelKey] = value;
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value;
          hasAttrsChanged = true;
        }
      }
    }
  }

  if (needCastKeys) {
    const rawCurrentProps = toRaw(props);
    const castValues = rawCastValues || EMPTY_OBJ;
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i];
      props[key] = resolvePropValue(
        options!,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      );
    }
  }

  return hasAttrsChanged;
}
