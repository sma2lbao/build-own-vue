import { effect } from "../src/effect";
import { ref } from "../src/ref";

describe("reactivity/ref", () => {
  // it("should hold a value", () => {
  //   const a = ref(1);
  //   expect(a.value).toBe(1);
  //   a.value = 2;
  //   expect(a.value).toBe(2);
  // });

  it("should be reactive", () => {
    const a = ref(1);
    let dummy;
    const fn = vi.fn(() => {
      dummy = a.value;
    });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    a.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(dummy).toBe(2);
    // same value should not trigger
    a.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
