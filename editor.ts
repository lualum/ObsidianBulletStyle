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

            // First pass: analyze structure (reverse order to determine hierarchy)
            const lineInfo: Array<{ indent: number; level: number }> = [];
            let block = { level: -1, indent: Infinity };

            for (let lineNum = lines.length - 1; lineNum >= 0; lineNum--) {
               const regex = lines[lineNum].match(/^(\s*)([-*+])(\s)(.*)$/);
               if (!regex) {
                  lineInfo[lineNum] = { indent: -1, level: -1 };
                  continue;
               }

               const tabSize = 4;
               const indent = regex[1].replace(
                  /\t/g,
                  " ".repeat(tabSize)
               ).length;

               if (indent < block.indent) {
                  block = {
                     level: block.level + 1,
                     indent,
                  };
               } else {
                  block = { level: 0, indent };
               }

               lineInfo[lineNum] = { indent, level: block.level };
            }

            // Second pass: apply decorations in forward order
            let index = 0;

            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
               const regex = lines[lineNum].match(/^(\s*)([-*+])(\s)(.*)$/);
               if (!regex) {
                  index += lines[lineNum].length + 1;
                  continue;
               }

               const level = lineInfo[lineNum].level;
               const bulletPos = index + regex[1].length;

               // Collect all decorations for this line
               const pendingDecorations: PendingDecoration[] = [];

               const symbol = this.applyModifiers(
                  pendingDecorations,
                  regex,
                  index,
                  level
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

               index += lines[lineNum].length + 1;
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

            // Apply font size to entire line if level > 0
            if (fontSize) {
               const lineStart = textIndex + trimOffset;
               const lineEnd = textIndex + trimOffset + text.length;
               const fontSizeDecoration = Decoration.mark({
                  attributes: {
                     style: `font-size: ${fontSize};`,
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
