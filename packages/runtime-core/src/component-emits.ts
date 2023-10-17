export type EmitsOptions = ObjectEmitsOptions | string[];

export type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
>;
