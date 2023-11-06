import {
  ComponentInternalInstance,
  callWithAsyncErrorHandling,
} from "@ovue/runtime-core";
import { hyphenate, isArray } from "@ovue/shared";

const veiKey = Symbol("_vei");
type EventValue = Function | Function[];

interface Invoker extends EventListener {
  value: EventValue;
  attached: number;
}

export function patchEvent(
  el: Element & { [veiKey]?: Record<string, Invoker | undefined> },
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | null,
  instance: ComponentInternalInstance | null = null
) {
  // vei = vue event invokers
  const invokers = el[veiKey] || (el[veiKey] = {});
  const existingInvoker = invokers[rawName];
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
  } else {
    const [name, options] = parseName(rawName);
    if (nextValue) {
      const invoker = (invokers[rawName] = createInvoker(nextValue, instance));
      addEventListener(el, name, invoker, options);
    } else if (existingInvoker) {
      // remove
      removeEventListener(el, name, existingInvoker, options);
      invokers[rawName] = undefined;
    }
  }
}

export function addEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
) {
  el.addEventListener(event, handler, options);
}

export function removeEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
) {
  el.removeEventListener(event, handler, options);
}

const optionsModifierRE = /(?:Once|Passive|Capture)$/;
function parseName(name: string): [string, EventListenerOptions | undefined] {
  let options: EventListenerOptions | undefined;
  if (optionsModifierRE.test(name)) {
    options = {};
    let m;
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length);
      (options as any)[m[0].toLowerCase()] = true;
    }
  }
  const event = name[2] === ":" ? name.slice(3) : hyphenate(name.slice(2));
  return [event, options];
}
let cachedNow: number = 0;
const p = Promise.resolve();
const getNow = () =>
  cachedNow || (p.then(() => (cachedNow = 0)), (cachedNow = Date.now()));
function createInvoker(
  initialValue: EventValue,
  instance: ComponentInternalInstance | null
) {
  const invoker: Invoker = (e: Event & { _vts?: number }) => {
    if (!e._vts) {
      e._vts = Date.now();
    } else if (e._vts <= invoker.attached) {
      return;
    }
    callWithAsyncErrorHandling(
      patchStopImmediatePropagation(e, invoker.value),
      instance,
      "NATIVE_EVENT_HANDLER",
      [e]
    );
  };

  invoker.value = initialValue;
  invoker.attached = getNow();
  return invoker;
}

function patchStopImmediatePropagation(
  e: Event,
  value: EventValue
): EventValue {
  if (isArray(value)) {
    const originalStop = e.stopImmediatePropagation;
    e.stopImmediatePropagation = () => {
      originalStop.call(e);
      (e as any)._stopped = true;
    };
    return value.map((fn) => (e: Event) => !(e as any)._stopped && fn && fn(e));
  } else {
    return value;
  }
}
