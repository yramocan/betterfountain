import * as vscode from "vscode";
import * as fs from "fs";
import { getActiveFountainDocument } from "../utils";
import { findManifestFor, loadManifest, Manifest } from "../manifest";

export class FountainManifestViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly _extensionUri: vscode.Uri) {}

	async resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): Promise<void> {
		webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };

		const codiconPath = vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css");
		const codiconUri = webviewView.webview.asWebviewUri(codiconPath).toString();
		webviewView.webview.html = this.getHtml(codiconUri);

		async function sendData() {
			const uri = getActiveFountainDocument();
			if (!uri) {
				webviewView.webview.postMessage({ command: "data", manifest: null, manifestPath: null });
				return;
			}
			const manifestUri = findManifestFor(uri);
			if (!manifestUri) {
				webviewView.webview.postMessage({ command: "data", manifest: null, manifestPath: null });
				return;
			}
			const manifest = loadManifest(manifestUri);
			if (!manifest) {
				webviewView.webview.postMessage({ command: "data", manifest: null, manifestPath: null });
				return;
			}
			webviewView.webview.postMessage({
				command: "data",
				manifest: { version: manifest.version ?? 1, entries: manifest.entries },
				manifestPath: manifestUri.toString(),
			});
		}

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) sendData();
		});
		if (webviewView.visible) sendData();

		webviewView.webview.onDidReceiveMessage(async (message: { command: string; manifest?: Manifest; manifestPath?: string }) => {
			if (message.command === "refresh") {
				await sendData();
				return;
			}
			if (message.command === "save" && message.manifest && message.manifestPath) {
				try {
					const uri = vscode.Uri.parse(message.manifestPath);
					fs.writeFileSync(uri.fsPath, JSON.stringify(message.manifest, null, 2), "utf8");
					vscode.window.setStatusBarMessage("Manifest saved.", 2000);
				} catch (err) {
					vscode.window.showErrorMessage(`Could not save manifest: ${(err as Error).message}`);
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
		.empty { opacity: 0.6; font-style: italic; }
		ul { list-style: none; padding: 0; margin: 0; }
		li { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--vscode-widget-border); }
		li.group { font-weight: 600; }
		li.group ul { margin-left: 12px; margin-top: 2px; }
		li .path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
		button { background: none; border: none; cursor: pointer; padding: 2px; color: var(--vscode-icon-foreground); }
		button:hover { color: var(--vscode-foreground); }
		.buttons { margin-top: 10px; }
		button.primary { padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; cursor: pointer; }
		button.primary:hover { background: var(--vscode-button-hoverBackground); }
	</style>
</head>
<body>
	<p class="empty" id="noManifest">Open a Fountain file in a project with screenplay.json to edit the manifest.</p>
	<div id="content" style="display:none">
		<h3>Script structure</h3>
		<ul id="entryList"></ul>
		<div class="buttons">
			<button id="btnSave" class="primary"><span class="codicon codicon-save"></span> Save</button>
			<button id="btnRefresh">Refresh</button>
		</div>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		let manifest = null;
		let manifestPath = '';

		window.addEventListener('message', e => {
			if (e.data.command !== 'data') return;
			manifest = e.data.manifest;
			manifestPath = e.data.manifestPath || '';
			const noManifest = document.getElementById('noManifest');
			const content = document.getElementById('content');
			if (!manifest || !manifest.entries || manifest.entries.length === 0) {
				noManifest.style.display = 'block';
				content.style.display = 'none';
				return;
			}
			noManifest.style.display = 'none';
			content.style.display = 'block';
			render(manifest.entries);
		});

		function render(entries, parentEl) {
			const container = parentEl || document.getElementById('entryList');
			if (!parentEl) container.innerHTML = '';
			entries.forEach((entry, idx) => {
				if (entry.path) {
					const li = document.createElement('li');
					li.dataset.index = idx;
					li.dataset.type = 'path';
					li.innerHTML = '<span class="path">' + escapeHtml(entry.path) + '</span><button class="up" title="Move up"><span class="codicon codicon-arrow-up"></span></button><button class="down" title="Move down"><span class="codicon codicon-arrow-down"></span></button>';
					li.querySelector('.up').onclick = () => moveEntry(entries, idx, -1);
					li.querySelector('.down').onclick = () => moveEntry(entries, idx, 1);
					container.appendChild(li);
				} else if (entry.label && entry.entries) {
					const li = document.createElement('li');
					li.className = 'group';
					li.dataset.index = idx;
					li.dataset.type = 'group';
					const inner = document.createElement('div');
					inner.innerHTML = '<span class="path">' + escapeHtml(entry.label) + '</span><button class="up" title="Move up"><span class="codicon codicon-arrow-up"></span></button><button class="down" title="Move down"><span class="codicon codicon-arrow-down"></span></button>';
					inner.querySelector('.up').onclick = () => moveEntry(entries, idx, -1);
					inner.querySelector('.down').onclick = () => moveEntry(entries, idx, 1);
					li.appendChild(inner);
					const sub = document.createElement('ul');
					render(entry.entries, sub);
					li.appendChild(sub);
					container.appendChild(li);
				}
			});
		}

		function escapeHtml(s) {
			const div = document.createElement('div');
			div.textContent = s;
			return div.innerHTML;
		}

		function moveEntry(entries, idx, delta) {
			const newIdx = Math.max(0, Math.min(entries.length - 1, idx + delta));
			if (newIdx === idx) return;
			const t = entries[idx];
			entries.splice(idx, 1);
			entries.splice(newIdx, 0, t);
			document.getElementById('entryList').innerHTML = '';
			render(manifest.entries);
		}

		document.getElementById('btnSave').onclick = () => {
			vscode.postMessage({ command: 'save', manifest, manifestPath });
		};
		document.getElementById('btnRefresh').onclick = () => vscode.postMessage({ command: 'refresh' });
	</script>
</body>
</html>`;
	}
}
