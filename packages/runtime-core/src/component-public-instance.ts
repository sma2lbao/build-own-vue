import { Data } from "./component";
import { ComponentOptionsBase } from "./component-options";

export interface ComponentCustomProperties {}

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
