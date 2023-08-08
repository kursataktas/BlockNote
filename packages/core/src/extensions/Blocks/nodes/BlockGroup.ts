import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";
import { BlockNoteDOMAttributes } from "../api/blockTypes";

export const BlockGroup = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "blockGroup",
  group: "blockGroup",
  content: "blockContainer+",

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "blockGroup") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockGroupDOMAttributes =
      this.options.domAttributes?.blockGroup || {};

    return [
      "div",
      mergeAttributes(
        {
          ...blockGroupDOMAttributes,
          class: blockGroupDOMAttributes.class
            ? styles.blockGroup + " " + blockGroupDOMAttributes.class
            : styles.blockGroup,
          "data-node-type": "blockGroup",
        },
        HTMLAttributes
      ),
      0,
    ];
  },
});
