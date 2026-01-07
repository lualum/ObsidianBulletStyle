import { bulletReplacementPlugin } from "editor";
import { Plugin } from "obsidian";
import {
   BetterBulletsSettings,
   BetterBulletsSettingTab,
   DEFAULT_SETTINGS,
} from "settings";

export default class BetterBulletsPlugin extends Plugin {
   settings: BetterBulletsSettings;
   settingsChanged = false;

   async onload() {
      await this.loadSettings();
      this.registerEditorExtension([bulletReplacementPlugin(this)]);
      this.addSettingTab(new BetterBulletsSettingTab(this.app, this));
   }

   async loadSettings() {
      this.settings = Object.assign(
         {},
         DEFAULT_SETTINGS,
         await this.loadData()
      );
   }

   async saveSettings() {
      await this.saveData(this.settings);
      this.app.workspace.updateOptions();
   }
}
