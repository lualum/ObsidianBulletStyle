import { RangeSetBuilder } from "@codemirror/state";
import {
   Decoration,
   DecorationSet,
   EditorView,
   ViewPlugin,
   ViewUpdate,
} from "@codemirror/view";
import type BetterBulletsPlugin from "main";
import { BulletWidget } from "widget";

export interface BulletType {
   symbol: string;
   style?: string;
}

interface PendingDecoration {
   from: number;
   to: number;
   decoration: Decoration;
}

export function bulletReplacementPlugin(plugin: BetterBulletsPlugin) {
   return ViewPlugin.fromClass(
      class {
         decorations: DecorationSet;
         plugin: BetterBulletsPlugin;

         constructor(view: EditorView) {
            this.plugin = plugin;
            this.decorations = this.format(view);
         }

         update(update: ViewUpdate) {
            if (
               update.docChanged ||
               update.viewportChanged ||
               update.selectionSet
            ) {
               this.decorations = this.format(update.view);
            }
         }

         format(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const lines = view.state.doc.toString().split("\n");
            const n = lines.length;

            // levels[i] stores the LIS length starting at line i
            const levels: number[] = new Array(n).fill(0);
            const indents: (number | null)[] = new Array(n).fill(null);

            // 1. Pre-calculate indents for all bullet lines
            for (let i = 0; i < n; i++) {
               const match = lines[i].match(/^(\s*)([-*+])(\s)(.*)$/);
               if (match) {
                  const tabSize = view.state.tabSize || 4;
                  indents[i] = match[1].replace(
                     /\t/g,
                     " ".repeat(tabSize)
                  ).length;
                  levels[i] = 1; // Minimum sequence length is 1
               }
            }

            // 2. DP Pass: Right-to-Left
            for (let i = n - 1; i >= 0; i--) {
               const currentIndent = indents[i];
               if (currentIndent === null) continue;

               for (let j = i + 1; j < n; j++) {
                  const nextIndent = indents[j];
                  if (nextIndent === null) continue;

                  // If we find a strictly deeper indent, try to extend that sequence
                  if (nextIndent > currentIndent) {
                     levels[i] = Math.max(levels[i], 1 + levels[j]);
                  }

                  if (nextIndent <= currentIndent) break;
               }
            }

            // 3. Second pass: Apply decorations
            let index = 0;
            for (let lineNum = 0; lineNum < n; lineNum++) {
               const line = lines[lineNum];
               const regex = line.match(/^(\s*)([-*+])(\s)(.*)$/);

               if (!regex || levels[lineNum] === 0) {
                  index += line.length + 1;
                  continue;
               }

               const depthLevel = levels[lineNum] - 1;
               const bulletPos = index + regex[1].length;
               const pendingDecorations: PendingDecoration[] = [];

               const symbol = this.applyModifiers(
                  pendingDecorations,
                  regex,
                  index,
                  depthLevel
               );

               const bulletDecoration = Decoration.replace({
                  widget: new BulletWidget(this.plugin.settings, symbol),
               });

               pendingDecorations.push({
                  from: bulletPos,
                  to: bulletPos + 1,
                  decoration: bulletDecoration,
               });

               pendingDecorations.sort((a, b) => a.from - b.from);
               for (const { from, to, decoration } of pendingDecorations) {
                  builder.add(from, to, decoration);
               }

               index += line.length + 1;
            }

            return builder.finish();
         }

         applyModifiers(
            decorations: PendingDecoration[],
            line: RegExpMatchArray,
            index: number,
            level: number
         ): BulletType {
            const styles: string[] = [];
            let symbolChar: string;

            const bulletPos = index + line[1].length;
            const textIndex = bulletPos + line[2].length + line[3].length;
            const fullText = line[4];
            const text = fullText.trim();
            const trimOffset = fullText.indexOf(text);

            // Set base symbol and size based on level
            let fontSize: string | null = null;
            switch (level) {
               case 0:
                  symbolChar = "-";
                  break;
               case 1:
                  symbolChar = "→";
                  fontSize = `${this.plugin.settings.parentSize}em`;
                  styles.push(`font-size: ${fontSize}`);
                  break;
               default:
                  symbolChar = "⇒";
                  fontSize = `${this.plugin.settings.grandparentSize}em`;
                  styles.push(`font-size: ${fontSize}`);
                  break;
            }
            if (this.plugin.settings.boldNonLeafText && level > 0) {
               styles.push("font-weight: bold");
            }

            // Apply font size to entire line if level > 0
            if (fontSize) {
               const lineStart = textIndex + trimOffset;
               const lineEnd = textIndex + trimOffset + text.length;
               const fontSizeDecoration = Decoration.mark({
                  attributes: {
                     style: `font-size: ${fontSize}; font-weight: ${
                        this.plugin.settings.boldNonLeafText && level > 0
                           ? "bold"
                           : "normal"
                     }`,
                  },
               });
               decorations.push({
                  from: lineStart,
                  to: lineEnd,
                  decoration: fontSizeDecoration,
               });
            }

            // 1. Note formatting (Note: )
            if (text.startsWith("Note: ")) {
               symbolChar = "*";

               const noteStart = textIndex + trimOffset;
               const noteEnd = noteStart + 5; // "Note:" is 5 characters
               const boldDecoration = Decoration.mark({
                  attributes: {
                     style: "font-weight: bold; font-style: italic;",
                  },
               });
               decorations.push({
                  from: noteStart,
                  to: noteEnd,
                  decoration: boldDecoration,
               });

               const noteTextStart = noteEnd + 1; // +1 for space after "Note:"
               const noteTextEnd = textIndex + trimOffset + text.length;
               const italicDecoration = Decoration.mark({
                  attributes: { style: "font-style: italic;" },
               });
               decorations.push({
                  from: noteTextStart,
                  to: noteTextEnd,
                  decoration: italicDecoration,
               });
            }

            // 2. Definition formatting (Term | Definition)
            const pipeIndex = text.indexOf(" | ");
            if (pipeIndex !== -1) {
               symbolChar = "@";

               // Term (before pipe): bold and highlight
               const termStart = textIndex + trimOffset;
               const termEnd = termStart + pipeIndex;

               const boldDecoration = Decoration.mark({
                  attributes: {
                     style: "font-weight: bold; background-color: var(--text-highlight-bg);",
                  },
               });
               decorations.push({
                  from: termStart,
                  to: termEnd,
                  decoration: boldDecoration,
               });

               // Definition (after pipe): italics
               const defStart = termEnd + 3; // +3 for " | "
               const defEnd = textIndex + trimOffset + text.length;
               const italicDecoration = Decoration.mark({
                  attributes: { style: "font-style: italic;" },
               });
               decorations.push({
                  from: defStart,
                  to: defEnd,
                  decoration: italicDecoration,
               });
            }

            // 3. Important formatting (!)
            if (text.endsWith("!")) {
               symbolChar = "!";
               styles.push("font-weight: bold");
               styles.push(
                  `color: ${this.plugin.settings.exclamationTextColor}`
               );

               const importantStart = textIndex + trimOffset;
               const importantEnd = textIndex + trimOffset + text.length;
               const boldDecoration = Decoration.mark({
                  attributes: {
                     style: `font-weight: bold; color: ${this.plugin.settings.exclamationTextColor};`,
                  },
               });
               decorations.push({
                  from: importantStart,
                  to: importantEnd,
                  decoration: boldDecoration,
               });
            }

            // 4. Quote formatting (text in quotes)
            const quoteRegex = /"([^"]+)"/g;
            let quoteMatch;
            while ((quoteMatch = quoteRegex.exec(text)) !== null) {
               const quoteStart = textIndex + trimOffset + quoteMatch.index;
               const quoteEnd = quoteStart + quoteMatch[0].length;
               const italicDecoration = Decoration.mark({
                  attributes: { style: "font-style: italic;" },
               });
               decorations.push({
                  from: quoteStart,
                  to: quoteEnd,
                  decoration: italicDecoration,
               });
            }

            // 5. Parenthesis formatting (text in parentheses)
            const parenRegex = /\([^)]+\)/g;
            let parenMatch;
            while ((parenMatch = parenRegex.exec(text)) !== null) {
               const parenStart = textIndex + trimOffset + parenMatch.index;
               const parenEnd = parenStart + parenMatch[0].length;
               const italicDecoration = Decoration.mark({
                  attributes: { style: "font-style: italic;" },
               });
               decorations.push({
                  from: parenStart,
                  to: parenEnd,
                  decoration: italicDecoration,
               });
            }

            // 6. Date formatting (4-digit years)
            const dateRegex = /\b\d{4}\b/g;
            let dateMatch;
            while ((dateMatch = dateRegex.exec(text)) !== null) {
               const dateStart = textIndex + trimOffset + dateMatch.index;
               const dateEnd = dateStart + dateMatch[0].length;
               const underlineDecoration = Decoration.mark({
                  attributes: { style: "text-decoration: underline;" },
               });
               decorations.push({
                  from: dateStart,
                  to: dateEnd,
                  decoration: underlineDecoration,
               });
            }

            // Combine all styles
            const symbol: BulletType = {
               symbol: symbolChar,
               ...(styles.length > 0 && { style: styles.join("; ") }),
            };

            return symbol;
         }
      },
      {
         decorations: (v) => v.decorations,
      }
   );
}
