export type Directive<T = any, V = any> =
  | ObjectDirective<T, V>
  | FunctionDirective<T, V>;

export interface DirectiveBinding<V = any> {
  instance: ComponentPublicInstance | null;
  value: V;
  oldValue: V | null;
  arg?: string;
  modifiers: DirectiveModifiers;
  dir: ObjectDirective<any, V>;
}
