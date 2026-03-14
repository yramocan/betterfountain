import * as vscode from "vscode";
import { getFountainConfig } from "../configloader";
import { getActiveFountainDocument } from "../utils";
import * as commands from "../commands";

/** FountainConfig keys that we expose in the PDF Export panel and their VS Code config keys. */
const CONFIG_MAP: { key: keyof import("../configloader").FountainConfig; pdfKey: string }[] = [
	{ key: "print_title_page", pdfKey: "printTitlePage" },
	{ key: "scenes_numbers", pdfKey: "sceneNumbers" },
	{ key: "embolden_scene_headers", pdfKey: "emboldenSceneHeaders" },
	{ key: "embolden_character_names", pdfKey: "emboldenCharacterNames" },
	{ key: "show_page_numbers", pdfKey: "showPageNumbers" },
	{ key: "print_sections", pdfKey: "printSections" },
	{ key: "print_synopsis", pdfKey: "printSynopsis" },
	{ key: "each_scene_on_new_page", pdfKey: "eachSceneOnNewPage" },
	{ key: "double_space_between_scenes", pdfKey: "doubleSpaceBetweenScenes" },
];

export class FountainPdfExportViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly _extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): void {
		webviewView.webview.options = {
			localResourceRoots: [this._extensionUri],
			enableScripts: true,
		};

		const codiconPath = vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css");
		const codiconUri = webviewView.webview.asWebviewUri(codiconPath).toString();

		webviewView.webview.html = this.getHtml(codiconUri);

		webviewView.webview.onDidReceiveMessage(async (message) => {
			const uri = getActiveFountainDocument();
			if (!uri) {
				vscode.window.showErrorMessage("Open a Fountain document first.");
				return;
			}

			if (message.command === "getConfig") {
				const config = getFountainConfig(uri) as unknown as Record<string, unknown>;
				const payload: Record<string, unknown> = {};
				CONFIG_MAP.forEach(({ key }) => {
					payload[key] = config[key];
				});
				webviewView.webview.postMessage({ command: "config", content: payload });
				return;
			}

			if (message.command === "export") {
				const overrides = message.overrides || {};
				const openAfter = !!message.openAfter;
				const highlightCharacters = !!message.highlightCharacters;
				const highlightChanges = !!message.highlightChanges;
				await commands.exportPdf(true, openAfter, highlightCharacters, highlightChanges, overrides);
				return;
			}

			if (message.command === "preview") {
				await vscode.commands.executeCommand("fountain.pdfpreview");
				return;
			}

			if (message.command === "saveSettings") {
				const pdfConfig = vscode.workspace.getConfiguration("fountain.pdf", uri);
				const updates = message.updates as Record<string, unknown>;
				for (const { key, pdfKey } of CONFIG_MAP) {
					if (updates[key] !== undefined) {
						await pdfConfig.update(pdfKey, updates[key], vscode.ConfigurationTarget.Workspace);
					}
				}
				vscode.window.showInformationMessage("PDF export settings saved.");
				return;
			}
		});

		// Send initial config when view becomes visible
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				const uri = getActiveFountainDocument();
				if (uri) {
					const config = getFountainConfig(uri) as unknown as Record<string, unknown>;
					const payload: Record<string, unknown> = {};
					CONFIG_MAP.forEach(({ key }) => {
						payload[key] = config[key];
					});
					webviewView.webview.postMessage({ command: "config", content: payload });
				}
			}
		});

		if (webviewView.visible) {
			const uri = getActiveFountainDocument();
			if (uri) {
				const config = getFountainConfig(uri) as unknown as Record<string, unknown>;
				const payload: Record<string, unknown> = {};
				CONFIG_MAP.forEach(({ key }) => {
					payload[key] = config[key];
				});
				webviewView.webview.postMessage({ command: "config", content: payload });
			}
		}
	}

	private getHtml(codiconUri: string): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${codiconUri}">
	<style>
		body { padding: 8px 12px; font-size: 13px; color: var(--vscode-foreground); }
		h3 { margin: 0 0 8px 0; font-size: 12px; font-weight: 600; opacity: 0.9; }
		.group { margin-bottom: 12px; }
		label { display: flex; align-items: center; gap: 6px; margin: 4px 0; cursor: pointer; }
		label input[type="checkbox"] { flex-shrink: 0; }
		select { margin: 4px 0; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; width: 100%; max-width: 140px; }
		.buttons { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
		button { padding: 6px 10px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 6px; }
		button:hover { background: var(--vscode-button-hoverBackground); }
		button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
		button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
		.codicon { font-size: 14px; }
		.note { font-size: 11px; opacity: 0.8; margin-top: 8px; }
	</style>
</head>
<body>
	<h3>Export options (one-off)</h3>
	<p class="note">Changes here apply only to the next export. Use "Save to settings" to persist.</p>
	<div class="group">
		<label><input type="checkbox" id="print_title_page"> Title page</label>
		<label><input type="checkbox" id="embolden_scene_headers"> Bold scene headers</label>
		<label><input type="checkbox" id="embolden_character_names"> Bold character names</label>
		<label><input type="checkbox" id="show_page_numbers"> Page numbers</label>
		<label><input type="checkbox" id="print_sections"> Sections</label>
		<label><input type="checkbox" id="print_synopsis"> Synopsis</label>
		<label><input type="checkbox" id="each_scene_on_new_page"> New page per scene</label>
		<label><input type="checkbox" id="double_space_between_scenes"> Double space between scenes</label>
		<label>Scene numbers: <select id="scenes_numbers"><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option></select></label>
	</div>
	<div class="group">
		<label><input type="checkbox" id="openAfter"> Open PDF after export</label>
		<label><input type="checkbox" id="highlightCharacters"> Highlight characters (pick in dialog)</label>
		<label><input type="checkbox" id="highlightChanges"> Highlight changes (Git)</label>
	</div>
	<div class="buttons">
		<button id="btnExport"><span class="codicon codicon-file-pdf"></span> Export PDF</button>
		<button id="btnExportOpen"><span class="codicon codicon-go-to-file"></span> Export and open</button>
		<button id="btnPreview" class="secondary"><span class="codicon codicon-preview"></span> Preview</button>
		<button id="btnSave" class="secondary"><span class="codicon codicon-save"></span> Save to settings</button>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		const ids = ['print_title_page','scenes_numbers','embolden_scene_headers','embolden_character_names','show_page_numbers','print_sections','print_synopsis','each_scene_on_new_page','double_space_between_scenes','openAfter','highlightCharacters','highlightChanges'];
		function getOverrides() {
			const o = {};
			ids.forEach(id => {
				const el = document.getElementById(id);
				if (!el) return;
				if (el.type === 'checkbox') o[id] = el.checked;
				else if (el.tagName === 'SELECT') o[id] = el.value;
			});
			return o;
		}
		function applyConfig(config) {
			ids.forEach(id => {
				const el = document.getElementById(id);
				if (!el || config[id] === undefined) return;
				if (el.type === 'checkbox') el.checked = !!config[id];
				else if (el.tagName === 'SELECT') el.value = config[id] || 'both';
			});
		}
		window.addEventListener('message', e => {
			if (e.data.command === 'config') applyConfig(e.data.content);
		});
		vscode.postMessage({ command: 'getConfig' });
		document.getElementById('btnExport').onclick = () => {
			const o = getOverrides();
			vscode.postMessage({ command: 'export', overrides: { print_title_page: o.print_title_page, scenes_numbers: o.scenes_numbers, embolden_scene_headers: o.embolden_scene_headers, embolden_character_names: o.embolden_character_names, show_page_numbers: o.show_page_numbers, print_sections: o.print_sections, print_synopsis: o.print_synopsis, each_scene_on_new_page: o.each_scene_on_new_page, double_space_between_scenes: o.double_space_between_scenes }, openAfter: false, highlightCharacters: o.highlightCharacters, highlightChanges: o.highlightChanges });
		};
		document.getElementById('btnExportOpen').onclick = () => {
			const o = getOverrides();
			vscode.postMessage({ command: 'export', overrides: { print_title_page: o.print_title_page, scenes_numbers: o.scenes_numbers, embolden_scene_headers: o.embolden_scene_headers, embolden_character_names: o.embolden_character_names, show_page_numbers: o.show_page_numbers, print_sections: o.print_sections, print_synopsis: o.print_synopsis, each_scene_on_new_page: o.each_scene_on_new_page, double_space_between_scenes: o.double_space_between_scenes }, openAfter: true, highlightCharacters: o.highlightCharacters, highlightChanges: o.highlightChanges });
		};
		document.getElementById('btnPreview').onclick = () => vscode.postMessage({ command: 'preview' });
		document.getElementById('btnSave').onclick = () => {
			const o = getOverrides();
			vscode.postMessage({ command: 'saveSettings', updates: { print_title_page: o.print_title_page, scenes_numbers: o.scenes_numbers, embolden_scene_headers: o.embolden_scene_headers, embolden_character_names: o.embolden_character_names, show_page_numbers: o.show_page_numbers, print_sections: o.print_sections, print_synopsis: o.print_synopsis, each_scene_on_new_page: o.each_scene_on_new_page, double_space_between_scenes: o.double_space_between_scenes } });
		};
	</script>
</body>
</html>`;
	}
}
