import { bulletReplacementPlugin } from "editor";
import { Plugin } from "obsidian";
import {
   BetterBulletsSettings,
   BetterBulletsSettingTab,
   DEFAULT_SETTINGS,
} from "settings";

export default class BetterBulletsPlugin extends Plugin {
   settings: BetterBulletsSettings;

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
   }

   refreshEditors() {
      // Force all editor views to update
      this.app.workspace.iterateAllLeaves((leaf) => {
         if (leaf.view.getViewType() === "markdown") {
            const view = leaf.view as any;
            if (view.editor?.cm) {
               view.editor.cm.requestMeasure();
            }
         }
      });
   }
}
