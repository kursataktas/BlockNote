import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../../api/block";
import { defaultProps } from "../../../api/defaultProps";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers";

export const paragraphPropSchema = {
  ...defaultProps,
};

export const ParagraphBlockContent = createStronglyTypedTiptapNode({
  name: "paragraph",
  content: "inline*",
  group: "blockContent",
  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "paragraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      "p",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const Paragraph = createBlockSpecFromStronglyTypedTiptapNode(
  ParagraphBlockContent,
  paragraphPropSchema
);
