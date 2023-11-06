import { includeBooleanAttr } from "@ovue/shared";

export function patchDOMProp(
  el: any,
  key: string,
  value: any,
  prevChildren: any,
  parentComponent: any,
  parentSuspense: any,
  unmountChildren: any
) {
  if (key === "innerHTML" || key === "textContent") {
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense);
    }
    el[key] = value == null ? "" : value;
    return;
  }

  const tag = el.tagName;

  if (key === "value" && tag !== "PROGRESS" && !tag.includes("-")) {
    el._value = value;

    const oldValue = tag === "OPTION" ? el.getAttribute("value") : el.value;
    const newValue = value == null ? "" : value;
    if (oldValue !== newValue) {
      el.value = newValue;
    }
    if (value == null) {
      el.removeAttribute(key);
    }
    return;
  }

  let needRemove = false;
  if (value === "" || value == null) {
    const type = typeof el[key];
    if (type === "boolean") {
      value = includeBooleanAttr(value);
    } else if (value == null && type === "string") {
      value = "";
      needRemove = true;
    } else if (type === "number") {
      value = 0;
      needRemove = true;
    }
  }

  try {
    el[key] = value;
  } catch (e: any) {}
  needRemove && el.removeAttribute(key);
}
