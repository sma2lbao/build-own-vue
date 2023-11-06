import { ComponentInternalInstance } from "@ovue/runtime-core";
import { includeBooleanAttr, isSpecialBooleanAttr } from "@ovue/shared";

export function patchAttr(
  el: Element,
  key: string,
  value: any,
  isSVG: boolean,
  instance?: ComponentInternalInstance | null
) {
  if (isSVG && key.startsWith("xlink:")) {
    console.info("svg暂未实现");
  } else {
    const isBoolean = isSpecialBooleanAttr(key);
    if (value == null || (isBoolean && !includeBooleanAttr(value))) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, isBoolean ? "" : value);
    }
  }
}
