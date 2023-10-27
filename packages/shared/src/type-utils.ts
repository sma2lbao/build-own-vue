/**
 * 通过检查  0  是否是  1 & T  的子类型来确定返回的类型。如果  0  是  1 & T  的子类型，则返回类型  Y ，否则返回类型  N 。
 * 这段代码主要用于检查泛型类型  T  是否是一个 "any" 类型。如果  T  是 "any" 类型，那么  0 extends 1 & T  的结果为  true ，返回类型为  Y 。否则，返回类型为  N 。
 */
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

// To prevent users with TypeScript versions lower than 4.5 from encountering unsupported Awaited<T> type, a copy has been made here.
export type Awaited<T> = T extends null | undefined
  ? T // special case for `null | undefined` when not in `--strictNullChecks` mode
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
  ? F extends (value: infer V, ...args: infer _) => any // if the argument to `then` is callable, extracts the first argument
    ? Awaited<V> // recursively unwrap the value
    : never // the argument to `then` was not callable
  : T; // non-object or non-thenable

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * 代码的逻辑是通过将联合类型  U  转换为交叉类型。它使用了条件类型和函数类型推断。 
 
首先，通过  U extends any ? (k: U) => void : never  来遍历联合类型  U  的每个成员。这里使用了条件类型，将每个成员作为函数参数  k ，并将其类型设置为  (k: U) => void 。 
 
然后，通过  (k: infer I) => void  来提取函数参数  k  的类型，并将其赋值给  I 。这里使用了类型推断。 
 
最后，通过条件类型判断  I  是否存在，如果存在则返回  I  作为结果，否则返回  never 。 
 
简而言之，这段代码的作用是将联合类型转换为交叉类型。它通过遍历联合类型的每个成员，并将其作为函数参数来提取每个成员的类型，然后将这些类型合并为一个交叉类型。

举例
type Person = { name: string } | { age: number };
type IntersectionType = UnionToIntersection<Person>;
const person: IntersectionType = {
  name: "Alice",
  age: 25
};
*/
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
