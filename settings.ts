import BetterBulletsPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface BetterBulletsSettings {
   boldNonLeafText: boolean; // bold text for non-leaf bullets
   parentSize: number; // font size multiplier for parent bullets
   grandparentSize: number; // font size multiplier for grandparent bullets
   leafTextColor: string; // color for leaf bullet text
   parentTextColor: string; // color for parent bullet text
   grandparentTextColor: string; // color for grandparent bullet text (empty = use accent)
   exclamationTextColor: string; // color for lines ending with !
}

export const DEFAULT_SETTINGS: BetterBulletsSettings = {
   boldNonLeafText: true,
   parentSize: 1.0,
   grandparentSize: 1.0,
   leafTextColor: "",
   parentTextColor: "",
   grandparentTextColor: "",
   exclamationTextColor: "#773757",
};

export class BetterBulletsSettingTab extends PluginSettingTab {
   plugin: BetterBulletsPlugin;

   constructor(app: App, plugin: BetterBulletsPlugin) {
      super(app, plugin);
      this.plugin = plugin;
   }

   display(): void {
      const { containerEl } = this;
      const d = DEFAULT_SETTINGS;

      containerEl.empty();

      containerEl.createEl("h2", { text: "Bullet to En Dash Settings" });

      containerEl.createEl("h3", { text: "Text Formatting" });

      // Bold grandparent text
      new Setting(containerEl)
         .setName("Bold non-leaf text")
         .setDesc("Bold text for non-leaf bullets (→).")
         .addToggle((toggle) =>
            toggle
               .setValue(this.plugin.settings.boldNonLeafText)
               .onChange(async (value) => {
                  this.plugin.settings.boldNonLeafText = value;
                  await this.plugin.saveSettings();
               })
         );

      containerEl.createEl("hr");

      containerEl.createEl("h3", { text: "Font Size Multipliers" });

      // Parent font size multiplier
      new Setting(containerEl)
         .setName("Parent bullet font size")
         .setDesc(
            `Font size multiplier for parent bullets (→). Default is ${d.parentSize}.`
         )
         .addText((text) =>
            text
               .setPlaceholder(String(d.parentSize))
               .setValue(String(this.plugin.settings.parentSize))
               .onChange(async (value) => {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.parentSize = numValue;
                     await this.plugin.saveSettings();
                  }
               })
         );

      // Grandparent font size multiplier
      new Setting(containerEl)
         .setName("Grandparent bullet font size")
         .setDesc(
            `Font size multiplier for grandparent bullets (⇒). Default is ${d.grandparentSize}.`
         )
         .addText((text) =>
            text
               .setPlaceholder(String(d.grandparentSize))
               .setValue(String(this.plugin.settings.grandparentSize))
               .onChange(async (value) => {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.grandparentSize = numValue;
                     await this.plugin.saveSettings();
                  }
               })
         );

      containerEl.createEl("hr");

      containerEl.createEl("h3", { text: "Text Colors" });

      // Leaf text color
      new Setting(containerEl)
         .setName("Leaf bullet text color")
         .setDesc("Color for leaf bullet text (–). Leave empty for default.")
         .addText((text) =>
            text
               .setPlaceholder(d.leafTextColor)
               .setValue(this.plugin.settings.leafTextColor)
               .onChange(async (value) => {
                  this.plugin.settings.leafTextColor = value;
                  await this.plugin.saveSettings();
               })
         );

      // Parent text color
      new Setting(containerEl)
         .setName("Parent bullet text color")
         .setDesc("Color for parent bullet text (→). Leave empty for default.")
         .addText((text) =>
            text
               .setPlaceholder(d.parentTextColor)
               .setValue(this.plugin.settings.parentTextColor)
               .onChange(async (value) => {
                  this.plugin.settings.parentTextColor = value;
                  await this.plugin.saveSettings();
               })
         );

      // Grandparent text color
      new Setting(containerEl)
         .setName("Grandparent bullet text color")
         .setDesc(
            "Color for grandparent bullet text (⇒). Leave empty to use accent color."
         )
         .addText((text) =>
            text
               .setPlaceholder(d.grandparentTextColor)
               .setValue(this.plugin.settings.grandparentTextColor)
               .onChange(async (value) => {
                  this.plugin.settings.grandparentTextColor = value;
                  await this.plugin.saveSettings();
               })
         );

      // Exclamation text color
      new Setting(containerEl)
         .setName("Exclamation line color")
         .setDesc(
            `Color for lines ending with ! (bold and colored). Default is ${d.exclamationTextColor}.`
         )
         .addText((text) =>
            text
               .setPlaceholder(d.exclamationTextColor)
               .setValue(this.plugin.settings.exclamationTextColor)
               .onChange(async (value) => {
                  this.plugin.settings.exclamationTextColor = value;
                  await this.plugin.saveSettings();
               })
         );

      containerEl.createEl("hr");

      containerEl.createEl("h3", { text: "Symbol Legend" });

      const legendContainer = containerEl.createDiv({ cls: "bullet-legend" });
      legendContainer.createEl("p", {
         text: "– Leaf bullets with no children",
      });
      legendContainer.createEl("p", { text: "→ Parent bullets with children" });
      legendContainer.createEl("p", {
         text: "⇒ Grandparent bullets with grandchildren",
      });
      legendContainer.createEl("p", {
         text: "∗ Note bullets (lines starting with 'Note:')",
      });

      containerEl.createEl("p", {
         text: "Note: Bullets with ⇒ or at the first indent level are displayed in accent color (unless custom color specified) and bold.",
         cls: "setting-item-description",
      });

      containerEl.createEl("hr");

      containerEl.createEl("h3", { text: "Auto-Formatting Rules" });

      const rulesContainer = containerEl.createDiv({ cls: "formatting-rules" });
      rulesContainer.createEl("p", {
         text: "When auto-formatting is enabled:",
      });
      rulesContainer.createEl("p", {
         text: "• Structure: Bold text for parent (→) and grandparent (⇒) bullets",
      });
      rulesContainer.createEl("p", {
         text: "• Definitions: Term | Definition → Term is bold and highlighted, definition is italic",
      });
      rulesContainer.createEl("p", { text: '• Quotes: "text" → Italic' });
      rulesContainer.createEl("p", { text: "• Parentheses: (text) → Italic" });
      rulesContainer.createEl("p", {
         text: "• Dates: 4-digit years (e.g., 2024) → Underlined",
      });
      rulesContainer.createEl("p", {
         text: "• Notes: Lines starting with 'Note:' → ∗ bullet, italic text, bold 'Note:'",
      });
      rulesContainer.createEl("p", {
         text: "• Exclamation: Lines ending with ! → Bold and custom color (takes precedence over all other rules)",
      });
   }
}
