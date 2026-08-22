const wrapTables = (node) => {
  if (!Array.isArray(node.children)) return;

  node.children = node.children.map((child) => {
    wrapTables(child);

    if (child.type !== 'element' || child.tagName !== 'table') return child;

    return {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-scroll'] },
      children: [child],
      position: child.position
    };
  });
};

export const rehypeTableScroll = () => (tree) => {
  wrapTables(tree);
};
