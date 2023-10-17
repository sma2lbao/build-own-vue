import { isReactive, reactive, toRaw } from "../src/reactive";

describe("reactivity/reactive", () => {
  test("Object", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    // has
    expect("foo" in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(["foo"]);
  });

  test("proto", () => {
    const obj = {};
    const reactiveObj = reactive(obj);
    expect(isReactive(reactiveObj)).toBe(true);
    // read prop of reactiveObject will cause reactiveObj[prop] to be reactive
    // @ts-expect-error
    const prototype = reactiveObj["__proto__"];
    const otherObj = { data: ["a"] };
    expect(isReactive(otherObj)).toBe(false);
    const reactiveOther = reactive(otherObj);
    expect(isReactive(reactiveOther)).toBe(true);
    expect(reactiveOther.data[0]).toBe("a");
  });

  test("nested reactives", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });

  // test("observing subtypes of WeakCollections(WeakMap, WeakSet)", () => {
  //   // subtypes of WeakMap
  //   class CustomMap extends WeakMap {}
  //   const cmap = reactive(new CustomMap());

  //   expect(cmap).toBeInstanceOf(WeakMap);
  //   expect(isReactive(cmap)).toBe(true);

  //   const key = {};
  //   cmap.set(key, {});
  //   expect(isReactive(cmap.get(key))).toBe(true);

  //   // subtypes of WeakSet
  //   class CustomSet extends WeakSet {}
  //   const cset = reactive(new CustomSet());

  //   expect(cset).toBeInstanceOf(WeakSet);
  //   expect(isReactive(cset)).toBe(true);

  //   let dummy;
  //   effect(() => (dummy = cset.has(key)));
  //   expect(dummy).toBe(false);
  //   cset.add(key);
  //   expect(dummy).toBe(true);
  //   cset.delete(key);
  //   expect(dummy).toBe(false);
  // });

  test("observed value should proxy mutations to original (Object)", () => {
    const original: any = { foo: 1 };
    const observed = reactive(original);
    // set
    observed.bar = 1;
    expect(observed.bar).toBe(1);
    expect(original.bar).toBe(1);
    // delete
    delete observed.foo;
    expect("foo" in observed).toBe(false);
    expect("foo" in original).toBe(false);
  });

  test("original value change should reflect in observed value (Object)", () => {
    const original: any = { foo: 1 };
    const observed = reactive(original);
    // set
    original.bar = 1;
    expect(original.bar).toBe(1);
    expect(observed.bar).toBe(1);
    // delete
    delete original.foo;
    expect("foo" in original).toBe(false);
    expect("foo" in observed).toBe(false);
  });

  test("setting a property with an unobserved value should wrap with reactive", () => {
    const observed = reactive<{ foo?: object }>({});
    const raw = {};
    observed.foo = raw;
    expect(observed.foo).not.toBe(raw);
    expect(isReactive(observed.foo)).toBe(true);
  });

  test("observing already observed value should return same Proxy", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    const observed2 = reactive(observed);
    expect(observed2).toBe(observed);
  });

  test("observing the same value multiple times should return same Proxy", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    const observed2 = reactive(original);
    expect(observed2).toBe(observed);
  });

  test("should not pollute original object with Proxies", () => {
    const original: any = { foo: 1 };
    const original2 = { bar: 2 };
    const observed = reactive(original);
    const observed2 = reactive(original2);
    observed.bar = observed2;
    expect(observed.bar).toBe(observed2);
    expect(original.bar).toBe(original2);
  });

  test("toRaw", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });

  test("toRaw on object using reactive as prototype", () => {
    const original = reactive({});
    const obj = Object.create(original);
    const raw = toRaw(obj);
    expect(raw).toBe(obj);
    expect(raw).not.toBe(toRaw(original));
  });

  // test('should not unwrap Ref<T>', () => {
  //   const observedNumberRef = reactive(ref(1))
  //   const observedObjectRef = reactive(ref({ foo: 1 }))

  //   expect(isRef(observedNumberRef)).toBe(true)
  //   expect(isRef(observedObjectRef)).toBe(true)
  // })
});
