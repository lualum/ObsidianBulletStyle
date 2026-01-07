# Better Bullets for Obsidian

Better Bullets is an Obsidian plugin that enhances the visual hierarchy and readability of your bullet points. It uses dynamic analysis to determine the depth of your lists and applies unique symbols, font sizes, and contextual formatting based on the content of your notes.

## Features

### 1. Hierarchical Bullet Symbols

The plugin automatically changes bullet symbols based on their relationship to other items in the list:

- **Grandparent (Level 2+):** Uses the `⇒` symbol.
- **Parent (Level 1):** Uses the `→` symbol.
- **Leaf (Level 0):** Uses the standard `-` symbol.

### 2. Dynamic Text Formatting

Text is formatted based on its position in a list and specific syntax within the line:

- **Automatic Sizing:** "Parent" and "Grandparent" lines are scaled up based on your settings to create a clear visual outline.
- **Non-Leaf Bolding:** High-level list items can be automatically bolded to act as section headers.
- **Definitions:** Using the `Term | Definition` syntax bolds the term, highlights it, and italicizes the definition.
- **Notes:** Lines starting with `Note: ` are italicized, with the word "Note:" set to bold and italic.
- **Importance:** Lines ending with an exclamation mark `!` are colored and bolded.
- **Automatic Markings:** \* **Years:** 4-digit years (e.g., 2024) are automatically underlined.
- **Quotes:** Text inside `"quotes"` is italicized.
- **Parentheses:** Text inside `(parentheses)` is italicized.

## Installation

1. Search for "Better Bullets" in the Obsidian Community Plugins (if submitted) or manually add it to your `.obsidian/plugins` folder.
2. Enable the plugin in settings.
3. Start typing bullet points using `-`, `*`, or `+`.
