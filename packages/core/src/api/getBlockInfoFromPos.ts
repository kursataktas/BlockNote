import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

type SingleBlockInfo = {
  node: Node;
  beforePos: number;
  afterPos: number;
};

export type BlockInfo = {
  /**
   * The outer node that represents a BlockNote block. This is the node that has the ID.
   * Most of the time, this will be a blockContainer node, but it could also be a Column or ColumnList
   */
  bnBlock: SingleBlockInfo;
  /**
   * The type of BlockNote block that this node represents.
   * When dealing with a blockContainer, this is retrieved from the blockContent node, otherwise it's retrieved from the bnBlock node.
   */
  blockNoteType: string;
} & (
  | {
      // In case we're not dealing with a BlockContainer, we're dealing with a "wrapper node" (like a Column or ColumnList), so it will always have children

      /**
       * The Prosemirror node that holds block.children. For non-blockContainer, this node will be the same as bnBlock.
       */
      childContainer: SingleBlockInfo;
      isBlockContainer: false;
    }
  | {
      /**
       * The Prosemirror node that holds block.children. For blockContainers, this is the blockGroup node, if it exists.
       */
      childContainer?: SingleBlockInfo;
      /**
       * The Prosemirror node that wraps block.content and has most of the props
       */
      blockContent: SingleBlockInfo;
      /**
       * Whether bnBlock is a blockContainer node
       */
      isBlockContainer: true;
    }
);

/**
 * Retrieves the position just before the nearest blockContainer node in a
 * ProseMirror doc, relative to a position. If the position is within a
 * blockContainer node or its descendants, the position just before it is
 * returned. If the position is not within a blockContainer node or its
 * descendants, the position just before the next closest blockContainer node
 * is returned. If the position is beyond the last blockContainer, the position
 * just before the last blockContainer is returned.
 * @param doc The ProseMirror doc.
 * @param pos An integer position.
 * @returns The position just before the nearest blockContainer node.
 */
export function getNearestBlockContainerPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);

  // Checks if the position provided is already just before a blockContainer
  // node, in which case we return the position.
  if ($pos.nodeAfter && $pos.nodeAfter.type.isInGroup("bnBlock")) {
    return {
      posBeforeNode: $pos.pos,
      node: $pos.nodeAfter,
    };
  }

  // Checks the node containing the position and its ancestors until a
  // blockContainer node is found and returned.
  let depth = $pos.depth;
  let node = $pos.node(depth);
  while (depth > 0) {
    if (node.type.isInGroup("bnBlock")) {
      return {
        posBeforeNode: $pos.before(depth),
        node: node,
      };
    }

    depth--;
    node = $pos.node(depth);
  }

  // If the position doesn't lie within a blockContainer node, we instead find
  // the position of the next closest one. If the position is beyond the last
  // blockContainer, we return the position of the last blockContainer. While
  // running `doc.descendants` is expensive, this case should be very rarely
  // triggered. However, it's possible for the position to sometimes be beyond
  // the last blockContainer node. This is a problem specifically when using the
  // collaboration plugin.
  const allBlockContainerPositions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock")) {
      allBlockContainerPositions.push(pos);
    }
  });

  // eslint-disable-next-line no-console
  console.warn(`Position ${pos} is not within a blockContainer node.`);

  const resolvedPos = doc.resolve(
    allBlockContainerPositions.find((position) => position >= pos) ||
      allBlockContainerPositions[allBlockContainerPositions.length - 1]
  );
  return {
    posBeforeNode: resolvedPos.pos,
    node: resolvedPos.nodeAfter!,
  };
}

export function getBlockInfoWithManualOffset(
  node: Node,
  bnBlockBeforePosOffset: number
): BlockInfo {
  if (!node.type.isInGroup("bnBlock")) {
    throw new Error(
      `Attempted to get bnBlock node at position but found node of different type ${node.type}`
    );
  }

  const bnBlockNode = node;
  const bnBlockBeforePos = bnBlockBeforePosOffset;
  const bnBlockAfterPos = bnBlockBeforePos + bnBlockNode.nodeSize;

  const bnBlock: SingleBlockInfo = {
    node: bnBlockNode,
    beforePos: bnBlockBeforePos,
    afterPos: bnBlockAfterPos,
  };

  if (bnBlockNode.type.name === "blockContainer") {
    let blockContent: SingleBlockInfo | undefined;
    let blockGroup: SingleBlockInfo | undefined;

    bnBlockNode.forEach((node, offset) => {
      if (node.type.spec.group === "blockContent") {
        // console.log(beforePos, offset);
        const blockContentNode = node;
        const blockContentBeforePos = bnBlockBeforePos + offset + 1;
        const blockContentAfterPos = blockContentBeforePos + node.nodeSize;

        blockContent = {
          node: blockContentNode,
          beforePos: blockContentBeforePos,
          afterPos: blockContentAfterPos,
        };
      } else if (node.type.name === "blockGroup") {
        const blockGroupNode = node;
        const blockGroupBeforePos = bnBlockBeforePos + offset + 1;
        const blockGroupAfterPos = blockGroupBeforePos + node.nodeSize;

        blockGroup = {
          node: blockGroupNode,
          beforePos: blockGroupBeforePos,
          afterPos: blockGroupAfterPos,
        };
      }
    });

    if (!blockContent) {
      throw new Error(
        `blockContainer node does not contain a blockContent node in its children: ${bnBlockNode}`
      );
    }

    return {
      isBlockContainer: true,
      bnBlock,
      blockContent,
      childContainer: blockGroup,
      blockNoteType: blockContent.node.type.name,
    };
  } else {
    if (!bnBlock.node.type.isInGroup("childContainer")) {
      throw new Error(
        `bnBlock node is not in the childContainer group: ${bnBlock.node}`
      );
    }

    return {
      isBlockContainer: false,
      bnBlock: bnBlock,
      childContainer: bnBlock,
      blockNoteType: bnBlock.node.type.name,
    };
  }
}

export function getBlockInfo(posInfo: { posBeforeNode: number; node: Node }) {
  return getBlockInfoWithManualOffset(posInfo.node, posInfo.posBeforeNode);
}

export function getBlockInfoFromResolvedPos(resolvedPos: ResolvedPos) {
  if (!resolvedPos.nodeAfter) {
    throw new Error(
      `Attempted to get blockContainer node at position ${resolvedPos.pos} but a node at this position does not exist`
    );
  }

  return getBlockInfoWithManualOffset(resolvedPos.nodeAfter, resolvedPos.pos);
}

export function getBlockInfoFromSelection(state: EditorState) {
  const posInfo = getNearestBlockContainerPos(
    state.doc,
    state.selection.anchor
  );
  const ret = getBlockInfo(posInfo);
  if (!ret.isBlockContainer) {
    throw new Error(
      `selection always expected to return blockContainer ${state.selection.anchor}`
    );
  }
  return ret;
}
