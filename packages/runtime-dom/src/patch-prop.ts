import { RendererOptions } from "@ovue/runtime-core";
import { isModelListener, isOn } from "@ovue/shared";
import { patchEvent } from "./modules/events";
import { patchDOMProp } from "./modules/props";
import { patchAttr } from "./modules/attrs";

type DOMRendererOptions = RendererOptions<Node, Element>;

export const patchProp: DOMRendererOptions["patchProp"] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG = false,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  if (key === "class") {
    console.log("patchProp 未实现 class");
  } else if (key === "style") {
    console.log("patchProp 未实现 style");
  } else if (isOn(key)) {
    if (!isModelListener(key)) {
      patchEvent(el, key, prevValue, nextValue, parentComponent);
    }
  } else if (
    key[0] === "."
      ? ((key = key.slice(1)), true)
      : key[0] === "^"
      ? ((key = key.slice(1)), false)
      : shouldSetAsProp(el, key, nextValue, isSVG)
  ) {
    patchDOMProp(
      el,
      key,
      nextValue,
      prevChildren,
      parentComponent,
      parentSuspense,
      unmountChildren
    );
  } else {
    if (key === "true-value") {
      (el as any)._trueValue = nextValue;
    } else if (key === "false-value") {
      (el as any)._falseValue = nextValue;
    }
    patchAttr(el, key, nextValue, isSVG, parentComponent);
  }
};

function shouldSetAsProp(
  el: Element,
  key: string,
  value: unknown,
  isSVG: boolean
) {
  if (isSVG) {
    console.info("未实现");
  }

  return key in el;
}
