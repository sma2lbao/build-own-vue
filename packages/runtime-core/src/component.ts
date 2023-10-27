import { IfAny, ShapeFlags } from "@ovue/shared";
import { EmitFn, EmitsOptions } from "./component-emits";
import {
  ComponentOptions,
  ComputedOptions,
  MethodOptions,
} from "./component-options";
import {
  ComponentPublicInstance,
  ComponentPublicInstanceConstructor,
} from "./component-public-instance";
import { VNode } from "./vnode";
import { SlotsType } from "./component-slots";
import { ComponentPropsOptions } from "./component-props";

export type Data = Record<string, unknown>;

export interface ComponentCustomProps {}

export type { ComponentOptions };

export interface ComponentInternalOptions {
  /**
   * @internal
   */
  __scopeId?: string;
  /**
   * @internal
   */
  __cssModules?: Data;

  __hmrId?: string;

  __isBuiltIn?: boolean;

  __file?: string;

  __name?: string;
}

/**
 * 函数组件定义
 */
export interface FunctionalComponent<
  P = {},
  E extends EmitsOptions = {},
  S extends Record<string, any> = any
> extends ComponentInternalOptions {
  (
    props: P,
    ctx: Omit<SetupContext<E, IfAny<S, {}, SlotsType<S>>>, "expose">
  ): any;
  props?: ComponentPropsOptions<P>;
  emits?: E | (keyof E)[];
  slots?: IfAny<S, SlotsType, SlotsType<S>>;
  inheriAttrs?: boolean;
  displayName?: string;
  // compatConfig?: CompatConfig;
}

export interface ClassComponent {
  new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>;
  __vccOpts: ComponentOptions;
}

export interface ComponentInternalInstance {
  uid: number;
  vnode: VNode;
  [key: string]: any;
}

export type Component<
  Props = any,
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> =
  | ConcreteComponent<Props, RawBindings, D, C, M>
  | ComponentPublicInstanceConstructor<Props>;

/**
 * Concrete component type matches its actual value: it's either an options
 * object, or a function. Use this where the code expects to work with actual
 * values, e.g. checking if its a function or not. This is mostly for internal
 * implementation code.
 */
export type ConcreteComponent<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> =
  | ComponentOptions<Props, RawBindings, D, C, M>
  | FunctionalComponent<Props, any>;

export type SetupContext<
  E = EmitsOptions,
  S extends SlotsType = {}
> = E extends any
  ? {
      attrs: Data;
      slots: UnwrapSlotsTypes<S>;
      emit: EmitFn<E>;
      expose: (exposed?: Record<string, any>) => void;
    }
  : never;

export function isStatefulComponent(instance: ComponentInternalInstance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT;
}

export function getExposeProxy(instance: ComponentInternalInstance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key: string) {
          if (key in target) {
            return target[key];
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
          }
        },
        has(target, key: string) {
          return key in target || key in publicPropertiesMap;
        },
      }))
    );
  }
}
