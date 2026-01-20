export const DOMGEN = new Proxy({}, {
    get(target, tagName) {
      const is_self_closing = ["img", "br", "hr", "input", "meta", "link", "area", "base", "col", "embed", "keygen", "param", "source", "track", "wbr"].includes(tagName);
      const result = (maybeAttributes, ...children) => {
        let attributes = {};
        if (typeof maybeAttributes === "object") {
          attributes = maybeAttributes;
        } else {
          children.unshift(maybeAttributes);
        }
        const attrs = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(" ");
        return `<${tagName} ${attrs}>${is_self_closing ? "" : `${children.join("")}</${tagName}>`}`
      }
      result.toString = () => result();
      return result;
    }
})