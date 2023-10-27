import { Prettify } from "@ovue/shared";
import { WatchOptions, WatchStopHandle } from "./api-watch";
import {
  ComponentInternalInstance,
  Data,
  getExposeProxy,
  isStatefulComponent,
} from "./component";
import { EmitFn, EmitsOptions } from "./component-emits";
import {
  ComponentInjectOptions,
  ComponentOptionsBase,
  ComputedOptions,
  ExtractComputedReturns,
  InjectToObject,
  MergedComponentOptionsOverride,
  MethodOptions,
} from "./component-options";
import { SlotsType, UnwrapSlotsType } from "./component-slots";
import { nextTick } from "./scheduler";
import { ShallowUnwrapRef, UnwrapNestedRefs } from "@ovue/reactivity";

export interface ComponentCustomProperties {}

export type ComponentPublicInstanceConstructor<
  T extends ComponentPublicInstance<
    Props,
    RawBindings,
    D,
    C,
    M
  > = ComponentPublicInstance<any>,
  Props = any,
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> = {
  __isFragment?: never;
  __isTeleport?: never;
  __isSuspense?: never;
  new (...args: any[]): T;
};

export type ComponentPublicInstance<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>,
  I extends ComponentInjectOptions = {},
  S extends SlotsType = {}
> = {
  $: ComponentInternalInstance;
  $data: D;
  $props: Prettify<
    MakeDefaultsOptional extends true
      ? Partial<Defaults> & Omit<P & PublicProps, keyof Defaults>
      : P & PublicProps
  >;
  $attra: Data;
  $refs: Data;
  $slots: UnwrapSlotsType<S>;
  $root: ComponentPublicInstance | null;
  $parent: ComponentPublicInstance | null;
  $emit: EmitFn<E>;
  $el: any;
  $options: Options & MergedComponentOptionsOverride;
  $forceUpdate: () => void;
  $nextTick: typeof nextTick;
  $watch<T extends string | ((...args: any) => any)>(
    source: T,
    cb: T extends (...args: any) => infer R
      ? (...args: [R, R]) => any
      : (...args: any) => any,
    options?: WatchOptions
  ): WatchStopHandle;
} & P &
  ShallowUnwrapRef<B> &
  UnwrapNestedRefs<D> &
  ExtractComputedReturns<C> &
  M &
  ComponentCustomProperties &
  InjectToObject<I>;

const getPublicInstance = (
  i: ComponentInternalInstance | null
): ComponentPublicInstance | ComponentInternalInstance["exposed"] | null => {
  if (!i) return null;
  if (isStatefulComponent(i)) return getExposeProxy(i) || i.proxy;
  return getPublicInstance(i.parent);
};
