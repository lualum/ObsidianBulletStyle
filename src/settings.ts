import { App, PluginSettingTab, Setting } from "obsidian";
import type BetterBulletsPlugin from "./main";

export interface BulletType {
	symbol: string;
	fontSize: number;
	cssClasses: string;
}

export interface BetterBulletsSettings {
	useDefinitionSymbol: boolean;
	hierarchyLevels: number;
	bulletTypes: BulletType[];
	exclamationTextColor: string;
}

export const DEFAULT_SETTINGS: BetterBulletsSettings = {
	useDefinitionSymbol: false,
	hierarchyLevels: 3,
	bulletTypes: [
		{ symbol: "-", fontSize: 1.0, cssClasses: "" },
		{ symbol: "→", fontSize: 1.2, cssClasses: "bold" },
		{ symbol: "⇒", fontSize: 1.4, cssClasses: "bold" },
	],
	exclamationTextColor: "var(--text-sub-accent)",
};

const STYLE_PRESETS = {
	"": "Normal",
	bold: "Bold",
	italic: "Italic",
	"bold italic": "Bold + italic",
	underline: "Underline",
	"bold underline": "Bold + underline",
};

export class BetterBulletsSettingTab extends PluginSettingTab {
	plugin: BetterBulletsPlugin;
	private levelSettingsContainer: HTMLElement | null = null;
	private levelSettings: Setting[] = [];

	constructor(app: App, plugin: BetterBulletsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl: page } = this;
		page.empty();

		new Setting(page).setName("Hierarchy configuration").setHeading();

		new Setting(page)
			.setName("Number of hierarchy levels")
			.setDesc("# of ancestor levels to style (1-10)")
			.addText((text) => {
				text.setValue(
					String(this.plugin.settings.hierarchyLevels)
				).onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num >= 1 && num <= 10) {
						this.plugin.settings.hierarchyLevels = num;
						this.adjustBulletTypesLength(num);
						this.renderLevelSettings();
						await this.triggerRefresh();
					}
				});

				text.inputEl.setCssProps({
					width: "50px",
					"text-align": "center",
				});

				return text;
			});

		this.levelSettingsContainer = page.createDiv("setting-group-no-border");
		this.renderLevelSettings();

		new Setting(page).setName("Text formatting").setHeading();

		new Setting(page)
			.setName("Use definition symbol")
			.setDesc("Instead of bullet, use '@'")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useDefinitionSymbol)
					.onChange(async (value) => {
						this.plugin.settings.useDefinitionSymbol = value;
						await this.triggerRefresh();
					})
			);

		new Setting(page)
			.setName("Exclamation line color")
			.setDesc("Color of exclamation text")
			.addText((text) => {
				text.setValue(
					this.plugin.settings.exclamationTextColor
				).onChange(async (value) => {
					this.plugin.settings.exclamationTextColor = value;
					await this.triggerRefresh();
				});

				text.inputEl.setCssProps({
					width: "200px",
					"text-align": "center",
				});

				return text;
			});
	}

	private ensureLevelExists(index: number): BulletType {
		if (this.plugin.settings.bulletTypes[index]) {
			return this.plugin.settings.bulletTypes[index];
		}

		const newLevel = DEFAULT_SETTINGS.bulletTypes[index]
			? { ...DEFAULT_SETTINGS.bulletTypes[index] }
			: {
					symbol: "*",
					fontSize: 1.2 + index * 0.2,
					cssClasses: "bold",
			  };

		this.plugin.settings.bulletTypes[index] = newLevel;
		return newLevel;
	}

	private createLevelSetting(index: number): Setting {
		const levelName = this.getLevelName(index);
		const level = this.ensureLevelExists(index);

		return new Setting(this.levelSettingsContainer!)
			.setName(`Level ${index + 1} (${levelName})`)
			.addText((text) => {
				text.setValue(level.symbol).onChange(async (value) => {
					this.ensureLevelExists(index).symbol = value;
					await this.triggerRefresh();
				});
				text.inputEl.setCssProps({
					width: "50px",
					"text-align": "center",
				});
				return text;
			})
			.addText((text) => {
				text.setValue(String(level.fontSize)).onChange(
					async (value) => {
						const num = parseFloat(value);
						if (!isNaN(num)) {
							this.ensureLevelExists(index).fontSize = num;
							await this.triggerRefresh();
						}
					}
				);
				text.inputEl.setCssProps({
					width: "50px",
					"text-align": "center",
				});
				return text;
			})
			.addDropdown((dropdown) => {
				Object.entries(STYLE_PRESETS).forEach(([value, label]) => {
					dropdown.addOption(value, label);
				});

				dropdown
					.setValue(level.cssClasses || "")
					.onChange(async (value) => {
						this.ensureLevelExists(index).cssClasses = value;
						await this.triggerRefresh();
					});

				dropdown.selectEl.setCssProps({
					width: "180px",
					"text-align": "center",
					"text-align-last": "center",
				});
				return dropdown;
			});
	}

	private renderLevelSettings() {
		if (!this.levelSettingsContainer) return;

		this.levelSettings = [];
		this.levelSettingsContainer.empty();

		for (let i = 0; i < this.plugin.settings.hierarchyLevels; i++) {
			this.levelSettings.push(this.createLevelSetting(i));
		}
	}

	private adjustBulletTypesLength(newLength: number) {
		const current = this.plugin.settings.bulletTypes;

		if (current.length < newLength) {
			for (let i = current.length; i < newLength; i++) {
				current.push({
					symbol: "*",
					fontSize: 1.2 + i * 0.2,
					cssClasses: "",
				});
			}
		} else if (current.length > newLength) {
			this.plugin.settings.bulletTypes = current.slice(0, newLength);
		}
	}

	private getLevelName(index: number): string {
		const names = ["leaf", "parent", "grandparent", "great-grandparent"];
		return names[index] ?? `great(x${index - 2})-grandparent`;
	}

	private async triggerRefresh() {
		await this.plugin.saveSettings();
		this.plugin.refreshEditors();
	}
}
