import { TestElement, logNodeOp, NodeOpTypes } from "./node-ops";
import { isOn } from "@ovue/shared";

export function patchProp(
  el: TestElement,
  key: string,
  prevValue: any,
  nextValue: any
) {
  logNodeOp({
    type: NodeOpTypes.PATCH,
    targetNode: el,
    propKey: key,
    propPrevValue: prevValue,
    propNextValue: nextValue,
  });
  el.props[key] = nextValue;
  if (isOn(key)) {
    const event = key[2] === ":" ? key.slice(3) : key.slice(2).toLowerCase();
    (el.eventListeners || (el.eventListeners = {}))[event] = nextValue;
  }
}
