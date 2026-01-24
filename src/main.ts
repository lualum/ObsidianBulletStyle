import type { EditorView } from "@codemirror/view";
import { bulletReplacementPlugin } from "editor";
import { MarkdownView, Plugin } from "obsidian";
import {
	BetterBulletsSettings,
	BetterBulletsSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

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
			(await this.loadData()) as BetterBulletsSettings,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refreshEditors() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			// Only Markdown views actually have editors
			if (!(leaf.view instanceof MarkdownView)) return;

			const editor = leaf.view.editor;
			if (!editor) return;

			// Obsidian attaches CodeMirror EditorView at runtime
			const cm = editor.cm as EditorView | undefined;
			if (!cm) return;

			cm.dispatch({
				selection: cm.state.selection,
			});
		});
	}
}
