/**
 * @fileoverview
 * ESLint custom rule ที่บังคับให้ทุกไฟล์ .ts/.tsx/.js ต้องมี file-level JSDoc
 * ที่เป็นภาษาไทย (มีอักขระ Unicode range ของภาษาไทยอย่างน้อย 1 ตัว).
 *
 * @reason
 * เพื่อให้เอกสารประกอบโค้ดเข้ากับ requirement ของโปรเจกต์ที่กำหนดให้ใช้
 * comment + JSDoc เป็นภาษาไทยครอบคลุมและเข้าใจง่ายในทุกไฟล์ที่ refactor.
 *
 * Rule ID: thingsboard/require-thai-jsdoc
 */

/**
 * ตรวจสอบว่าข้อความมีอักขระภาษาไทยอย่างน้อย 1 ตัวหรือไม่.
 * ช่วง Unicode ของภาษาไทยคือ U+0E00 ถึง U+0E7F.
 *
 * @param {string} text - ข้อความที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้ามีอักขระภาษาไทยอย่างน้อย 1 ตัว, false ถ้าไม่มี
 */
function containsThaiCharacter(text) {
  // Unicode range ของภาษาไทย: ครอบคลุมอักขระไทยทุกตัว (U+0E00 - U+0E7F)
  const thaiCharacterPattern = /[\u0E00-\u0E7F]/;
  return thaiCharacterPattern.test(text);
}

/**
 * ดึง comment แรกสุดของไฟล์ (หากเป็น Block comment แบบ JSDoc).
 *
 * @param {import('eslint').SourceCode} sourceCode - ESLint SourceCode object
 * @returns {import('estree').Comment | undefined} comment object หรือ undefined ถ้าไม่มี
 */
function getLeadingJSDocComment(sourceCode) {
  const allComments = sourceCode.getAllComments();
  if (allComments.length === 0) {
    return undefined;
  }

  const firstComment = allComments[0];
  // ตรวจว่าเป็น Block comment (ประเภท "Block") — JSDoc เป็น Block comment ที่ขึ้นต้นด้วย /**
  if (firstComment.type !== "Block") {
    return undefined;
  }

  // ตรวจว่าขึ้นต้นด้วย /** (JSDoc marker) — JSDoc value จะขึ้นต้นด้วย *
  if (!firstComment.value.startsWith("*")) {
    return undefined;
  }

  return firstComment;
}

/** @type {import('eslint').Rule.RuleModule} */
const requireThaiJsdocRule = {
  meta: {
    type: "problem",
    docs: {
      description: "บังคับให้ทุกไฟล์ต้องมี file-level JSDoc ที่เป็นภาษาไทย",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      missingJsdoc:
        "ไฟล์นี้ขาด file-level JSDoc — ทุกไฟล์ต้องมี @fileoverview ที่อธิบายหน้าที่ของไฟล์",
      missingThaiContent:
        "JSDoc บนสุดของไฟล์ต้องมีอักขระภาษาไทยอย่างน้อย 1 ตัว (requirement ของโปรเจกต์)",
    },
    schema: [], // ไม่รับ options
  },

  create(context) {
    // ข้ามไฟล์ที่ไม่ใช่ source code (เช่น config files, type declarations)
    const filename = context.getFilename();
    const skippedFilePatterns = [
      /\.d\.ts$/, // type declaration files
      /node_modules\//, // dependencies
      /\.next\//, // Next.js build output
      /coverage\//, // test coverage
    ];

    if (skippedFilePatterns.some((pattern) => pattern.test(filename))) {
      return {};
    }

    return {
      // ตรวจที่ Program node (root) — ทำงานครั้งเดียวต่อไฟล์
      Program(node) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const leadingComment = getLeadingJSDocComment(sourceCode);

        if (!leadingComment) {
          context.report({
            node,
            messageId: "missingJsdoc",
          });
          return;
        }

        // ตรวจว่า JSDoc มีอักขระภาษาไทยอย่างน้อย 1 ตัว
        if (!containsThaiCharacter(leadingComment.value)) {
          context.report({
            node,
            messageId: "missingThaiContent",
          });
        }
      },
    };
  },
};

export default requireThaiJsdocRule;
