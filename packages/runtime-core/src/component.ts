import { EMPTY_OBJ, IfAny, ShapeFlags } from "@ovue/shared";
import { createAppContext } from "./api-create-app";
import { EmitFn, EmitsOptions } from "./component-emits";
import {
  ComponentOptions,
  ComputedOptions,
  MethodOptions,
} from "./component-options";
import {
  ComponentPublicInstance,
  ComponentPublicInstanceConstructor,
  publicPropertiesMap,
} from "./component-public-instance";
import { VNode } from "./vnode";
import { SlotsType } from "./component-slots";
import { ComponentPropsOptions, initProps } from "./component-props";

import { EffectScope, markRaw, proxyRefs } from "@ovue/reactivity";
type GlobalInstanceSetter = ((
  instance: ComponentInternalInstance | null
) => void) & { version?: string };

let internalSetCurrentInstance: GlobalInstanceSetter;

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
      // slots: UnwrapSlotsTypes<S>;
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

const emptyAppContext = createAppContext?.();

let uid = 0;

export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: null
) {
  const type = vnode.type as ConcreteComponent;
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext;

  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null!,
    next: null,
    subTree: null!,
    effect: null,
    update: null,
    scope: new EffectScope(true),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null!,
    renderCache: [],

    components: null,
    directives: null,

    // propsOptions: normalizePropsOptions(type, appContext),
    // emitsOptions: normalizeEmitsOptions(type, appContext),

    emit: null!,
    emitted: null,

    propsDefaults: EMPTY_OBJ,

    // inheritAttrs: type.inheritAttrs,

    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,

    attrsProxy: null,
    slotsProxy: null,

    suspense,
    // suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,

    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null,
  };

  instance.ctx = { _: instance };

  instance.root = parent ? parent.root : instance;
  // instance.emit = emit.bind(null, instance);

  if (vnode.ce) {
    vnode.ce(instance);
  }

  return instance;
}

export let isInSSRComponentSetup = false;

export function setupComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode;
  const isStateful = isStatefulComponent(instance);
  initProps(instance, props, isStateful);
  // initSlots(instance, children);

  const setupResult = isStateful ? setupStatefulComponent(instance) : undefined;
  return setupResult;
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
  const Component = instance.type as ComponentOptions;
}

export let currentInstance: ComponentInternalInstance | null = null;

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  internalSetCurrentInstance(instance);
  instance.scope.on();
};

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off();
  internalSetCurrentInstance(null);
};
