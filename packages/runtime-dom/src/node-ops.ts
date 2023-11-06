import { RendererOptions } from "@ovue/runtime-core";

export const svgNS = "http:// www.w3.org/2000/svg";

const doc = (typeof document !== "undefined" ? document : null) as Document;

const templateContainer = doc && doc.createElement("template");

export const nodeOps: Omit<RendererOptions<Node, Element>, "patchProp"> = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },
  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement: (tag, isSVG, is, props): Element => {
    const el = isSVG
      ? doc.createElementNS(svgNS, tag)
      : doc.createElement(tag, is ? { is } : undefined);

    if (tag === "select" && props && props.multiple != null) {
      (el as HTMLSelectElement).setAttribute("multiple", props.multiple);
    }
    return el;
  },
  createText: (text) => doc.createTextNode(text),
  createComment: (text) => doc.createComment(text),
  setText: (node, text) => {
    node.nodeValue = text;
  },
  setElementText: (el, text) => {
    el.textContent = text;
  },
  parentNode: (node) => node.parentNode as Element | null,
  nextSibling: (node) => node.nextSibling,
  querySelector: (selector) => doc.querySelector(selector),

  setScopeId(el, id) {
    el.setAttribute(id, "");
  },

  insertStaticContent(content, parent, anchor, isSVG, start, end) {
    const before = anchor ? anchor.previousSibling : parent.lastChild;
    if (start && (start === end || start.nextSibling)) {
      // cached
      while (true) {
        parent.insertBefore(start!.cloneNode(true), anchor);
        if (start === end || !(start = start!.nextSibling)) break;
      }
    } else {
      // fresh insert
      templateContainer.innerHTML = isSVG ? `<svg>${content}</svg>` : content;
      const template = templateContainer.content;
      if (isSVG) {
        // remove outer svg wrapper
        const wrapper = template.firstChild!;
        while (wrapper.firstChild) {
          template.appendChild(wrapper.firstChild);
        }
        template.removeChild(wrapper);
      }
      parent.insertBefore(template, anchor);
    }

    return [
      // first
      before ? before.nextSibling! : parent.firstChild!,
      // last
      anchor ? anchor.previousSibling! : parent.lastChild!,
    ];
  },
};
