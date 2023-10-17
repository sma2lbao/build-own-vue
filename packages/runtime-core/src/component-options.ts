import { ComputedGetter, WritableComputedOptions } from "@ovue/reactivity";
import { EmitsOptions } from "./component-emits";
import { SlotsType } from "./component-slots";
import { VNodeChild } from "./vnode";

export interface MethodOptions {
  [key: string]: Function;
}

export type ComputedOptions = Record<
  string,
  ComputedGetter<any> | WritableComputedOptions<any>
>;

export type RenderFunction = () => VNodeChild;

export interface RuntimeCompilerOptions {
  isCustomElement?: (tag: string) => boolean;
  whitespace?: "preserve" | "condense";
  comments?: boolean;
  delimiters?: [string, string];
}

export interface ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C extends ComputedOptions,
  M extends MethodOptions,
  Mixin extends ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin,
  E extends EmitsOptions,
  EE extends string = string,
  Default = {},
  I extends ComponentInjectOptions = {},
  II extends string = string,
  S extends SlotsType = {}
> extends LegacyOptions<Props, D, C, M, Mixin, Extends, I, II>,
    ComponentInternalOptions,
    ComponentCustomOptions {
  setup?: (
    this: void,
    props: LooseRequired<
      Props &
        Prettify<
          UnwrapMixinsType<
            IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
            "P"
          >
        >
    >,
    ctx: SetupContext<E, S>
  ) => Promise<RawBindings> | RawBindings | RenderFunction | void;
  name?: string;
  template?: string | object;
}

export type ComponentOptions<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = any,
  M extends MethodOptions = any,
  Mixin extends ComponentOptionsMixin = any,
  Extends extends ComponentOptionsMixin = any,
  E extends EmitsOptions = any,
  S extends SlotsType = any
> = ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  string,
  S
> &
  ThisType<
    CreateComponentPublicInstance<
      {},
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      Readonly<Props>
    >
  >;

export type ComponentOptionsMixin = ComponentOptionsBase<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
