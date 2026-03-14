import * as vscode from "vscode";
import { getActiveFountainDocument } from "../utils";
import { getFountainConfig } from "../configloader";
import { retrieveScreenPlayStatistics } from "../statistics";
import {
	getSidecarPath,
	loadSidecar,
	saveSidecar,
	mergeWithScript,
	firstAppearanceFromReport,
	CharacterSidecar,
} from "../characterStorage";

export class FountainCharacterDetailsViewProvider implements vscode.WebviewViewProvider {
	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly getParsedDocuments: () => Map<string, import("../afterwriting-parser").parseoutput>,
	) {}

	async resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): Promise<void> {
		webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };

		const codiconPath = vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css");
		const codiconUri = webviewView.webview.asWebviewUri(codiconPath).toString();
		webviewView.webview.html = this.getHtml(codiconUri);

		const getParsedDocuments = this.getParsedDocuments;
		async function sendData() {
			const uri = getActiveFountainDocument();
			if (!uri) {
				webviewView.webview.postMessage({ command: "data", sidecar: null, scriptNames: [] });
				return;
			}
			const parsed = getParsedDocuments().get(uri.toString());
			if (!parsed) {
				webviewView.webview.postMessage({ command: "data", sidecar: null, scriptNames: [] });
				return;
			}
			const scriptNames = Array.from(parsed.properties.characters.keys()) as string[];
			const sidecarPath = getSidecarPath(uri);
			let sidecar = loadSidecar(sidecarPath);
			let stats: Awaited<ReturnType<typeof retrieveScreenPlayStatistics>> | null = null;
			try {
				const doc = await vscode.workspace.openTextDocument(uri);
				const config = getFountainConfig(uri);
				stats = await retrieveScreenPlayStatistics(doc.getText(), parsed, config, undefined);
			} catch {
				// ignore
			}
			const firstApp = stats ? firstAppearanceFromReport(stats.characterStats.characters) : undefined;
			sidecar = mergeWithScript(sidecar, scriptNames, firstApp);
			saveSidecar(sidecarPath, sidecar);
			webviewView.webview.postMessage({
				command: "data",
				sidecar: sidecar,
				scriptNames,
				sidecarPath: sidecarPath.toString(),
			});
		}

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) sendData();
		});
		if (webviewView.visible) sendData();

		webviewView.webview.onDidReceiveMessage(async (message: { command: string; sidecar?: CharacterSidecar; sidecarPath?: string }) => {
			if (message.command === "refresh") {
				await sendData();
				return;
			}
			if (message.command === "save" && message.sidecar && message.sidecarPath) {
				try {
					const uri = vscode.Uri.parse(message.sidecarPath);
					saveSidecar(uri, message.sidecar);
					vscode.window.setStatusBarMessage("Character details saved.", 2000);
				} catch (err) {
					vscode.window.showErrorMessage(`Could not save: ${(err as Error).message}`);
				}
			}
		});
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
		h3 { margin: 0 0 8px 0; font-size: 12px; font-weight: 600; }
		select { width: 100%; padding: 6px; margin-bottom: 10px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
		label { display: block; margin: 8px 0 2px 0; opacity: 0.9; }
		textarea, input[type="text"] { width: 100%; padding: 6px; margin-bottom: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); box-sizing: border-box; }
		textarea { min-height: 60px; resize: vertical; }
		.readonly { opacity: 0.8; font-size: 12px; }
		button { margin-top: 8px; padding: 6px 12px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; }
		button:hover { background: var(--vscode-button-hoverBackground); }
		button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); margin-left: 6px; }
		.empty { opacity: 0.6; font-style: italic; }
	</style>
</head>
<body>
	<p class="empty" id="noDoc">Open a Fountain document to edit character details.</p>
	<div id="content" style="display:none">
		<label>Character</label>
		<select id="characterSelect"></select>
		<label>Description</label>
		<textarea id="description" rows="2"></textarea>
		<label>Role</label>
		<input type="text" id="role" placeholder="e.g. Protagonist">
		<label>Notes</label>
		<textarea id="notes" rows="2"></textarea>
		<label class="readonly">First appearance (from script)</label>
		<p id="firstAppearance" class="readonly"></p>
		<button id="btnSave"><span class="codicon codicon-save"></span> Save</button>
		<button id="btnRefresh" class="secondary">Refresh</button>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		let sidecar = null;
		let scriptNames = [];
		let sidecarPath = '';

		window.addEventListener('message', e => {
			if (e.data.command !== 'data') return;
			sidecar = e.data.sidecar;
			scriptNames = e.data.scriptNames || [];
			sidecarPath = e.data.sidecarPath || '';
			const noDoc = document.getElementById('noDoc');
			const content = document.getElementById('content');
			if (!sidecar || scriptNames.length === 0) {
				noDoc.style.display = 'block';
				content.style.display = 'none';
				return;
			}
			noDoc.style.display = 'none';
			content.style.display = 'block';
			const sel = document.getElementById('characterSelect');
			sel.innerHTML = '';
			const names = Object.keys(sidecar.characters).sort();
			names.forEach(name => {
				const opt = document.createElement('option');
				opt.value = name;
				opt.textContent = name;
				sel.appendChild(opt);
			});
			sel.onchange = fillForm;
			fillForm();
		});

		function fillForm() {
			const name = document.getElementById('characterSelect').value;
			if (!name || !sidecar || !sidecar.characters[name]) return;
			const c = sidecar.characters[name];
			document.getElementById('description').value = c.description || '';
			document.getElementById('role').value = c.role || '';
			document.getElementById('notes').value = c.notes || '';
			const fa = c.firstAppearance;
			document.getElementById('firstAppearance').textContent = fa ? (fa.sceneTitle || 'Scene') + ' (line ' + (fa.line + 1) + ')' : '—';
		}

		document.getElementById('description').onchange = updateCurrent;
		document.getElementById('role').onchange = updateCurrent;
		document.getElementById('notes').onchange = updateCurrent;
		function updateCurrent() {
			const name = document.getElementById('characterSelect').value;
			if (!sidecar || !sidecar.characters[name]) return;
			sidecar.characters[name].description = document.getElementById('description').value;
			sidecar.characters[name].role = document.getElementById('role').value;
			sidecar.characters[name].notes = document.getElementById('notes').value;
		}

		document.getElementById('btnSave').onclick = () => {
			updateCurrent();
			vscode.postMessage({ command: 'save', sidecar, sidecarPath });
		};
		document.getElementById('btnRefresh').onclick = () => vscode.postMessage({ command: 'refresh' });
	</script>
</body>
</html>`;
	}
}
