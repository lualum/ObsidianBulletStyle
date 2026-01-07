import BetterBulletsPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface BetterBulletsSettings {
   boldNonLeafText: boolean;
   parentSize: number;
   grandparentSize: number;
   exclamationTextColor: string;
}

export const DEFAULT_SETTINGS: BetterBulletsSettings = {
   boldNonLeafText: true,
   parentSize: 1.2,
   grandparentSize: 1.4,
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
      containerEl.empty();

      containerEl.createEl("h3", { text: "Text Formatting" });

      new Setting(containerEl)
         .setName("Bold non-leaf text")
         .addToggle((toggle) =>
            toggle
               .setValue(this.plugin.settings.boldNonLeafText)
               .onChange(async (value) => {
                  this.plugin.settings.boldNonLeafText = value;
                  this.triggerRefresh();
               })
         );

      containerEl.createEl("h3", { text: "Font Size Multipliers" });

      new Setting(containerEl)
         .setName("Parent bullet font size")
         .addText((text) =>
            text
               .setValue(String(this.plugin.settings.parentSize))
               .onChange(async (value) => {
                  const num = parseFloat(value);
                  if (!isNaN(num)) {
                     this.plugin.settings.parentSize = num;
                     this.triggerRefresh();
                  }
               })
         );

      new Setting(containerEl)
         .setName("Grandparent bullet font size")
         .addText((text) =>
            text
               .setValue(String(this.plugin.settings.grandparentSize))
               .onChange(async (value) => {
                  const num = parseFloat(value);
                  if (!isNaN(num)) {
                     this.plugin.settings.grandparentSize = num;
                     this.triggerRefresh();
                  }
               })
         );

      new Setting(containerEl)
         .setName("Exclamation line color")
         .addText((text) =>
            text
               .setValue(this.plugin.settings.exclamationTextColor)
               .onChange(async (value) => {
                  this.plugin.settings.exclamationTextColor = value;
                  this.triggerRefresh();
               })
         );
   }

   private async triggerRefresh() {
      this.plugin.settingsChanged = true;
      await this.plugin.saveSettings();
      this.app.workspace.updateOptions();
   }
}
