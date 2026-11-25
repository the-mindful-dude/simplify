/**
 * Report-only ESLint rule for I-F1.1 / ADR-003 / ADR-014.
 *
 * Flags literal hex colours (3, 4, 6 or 8 digits) in component source so they
 * can be replaced with semantic --sd-* design tokens. Token sources are not
 * targeted by the flat-config block that enables this rule.
 */
const HEX_COLOR =
  /(?:^|[^\p{L}\p{N}_])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/u;

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report raw hex colours outside the canonical token source.',
    },
    schema: [],
    messages: {
      hexLiteral:
        'Raw hex colour "{{value}}" is not allowed here. Use a semantic --sd-* design token.',
    },
  },

  create(context) {
    const report = (node, value) => {
      if (typeof value !== 'string') {
        return;
      }
      const match = HEX_COLOR.exec(value);
      if (match === null) {
        return;
      }
      context.report({
        node,
        messageId: 'hexLiteral',
        data: { value: match[0].trim() },
      });
    };

    return {
      Literal(node) {
        report(node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          report(quasi, quasi.value.cooked ?? quasi.value.raw);
        }
      },
    };
  },
};
