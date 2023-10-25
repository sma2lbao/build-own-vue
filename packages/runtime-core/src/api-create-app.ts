import { InjectionKey } from "./api-inject";
import { Component, Data } from "./component";
import { ComponentOptions, RuntimeCompilerOptions } from "./component-options";
import {
  ComponentCustomProperties,
  ComponentPublicInstance,
} from "./component-public-instance";
import { Directive } from "./directives";

export interface App<HostElement = any> {
  version: string;
  config: AppConfig;

  use<Options extends unknown[]>(
    plugin: Plugin<Options>,
    ...options: Options
  ): this;
  use<Options>(plugin: Plugin<Options>, options: Options): this;

  mixin(mixin: ComponentOptions): this;
  component(name: string): Component | undefined;
  component(name: string, component: Component): this;
  directive(name: string): Directive | undefined;
  directive(name: string, directive: Directive): this;
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance;
  unmount(): void;
  provide<T>(key: InjectionKey<T> | string, value: T): this;

  runWithContext<T>(fn: () => T): T;
}

export type OptionMergeFunction = (to: unknown, from: unknown) => any;

export interface AppConfig {
  readonly isNativeTag?: (tag: string) => boolean;

  performance: boolean;
  optionMergeStrategies: Record<string, OptionMergeFunction>;
  globalProperties: ComponentCustomProperties & Record<string, any>;
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => void;
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void;

  compilerOptions: RuntimeCompilerOptions;
}

type PluginInstallFunction<Options> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any;

export type Plugin<Options = any[]> =
  | (PluginInstallFunction<Options> & {
      install?: PluginInstallFunction<Options>;
    })
  | {
      install: PluginInstallFunction<Options>;
    };

export type CreateAppFunction<HostElement> = (
  rootComponent: Component,
  rootProps?: Data | null
) => App<HostElement>;

export interface AppContext {
  app: App;
  config: AppConfig;
  mixins: ComponentOptions[];
  components: Record<string, Component>;
  directives: Record<string, Directive>;
  provides: Record<string | symbol, any>;

  optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>;

  // TODO

  /**
   * HMR only
   * @internal
   */
  reload?: () => void;

  /**
   * v2 compat only
   */
  filters?: Record<string, Function>;
}
