import { Data } from "./component";

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
