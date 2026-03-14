import * as vscode from "vscode";
import { parsedDocuments } from "../extension";
import { StructToken } from "../afterwriting-parser";

export class FountainFoldingRangeProvider implements vscode.FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
		var ranges: vscode.FoldingRange[] = [];
		if (parsedDocuments.has(document.uri.toString())) {
			const synopsisVisible = vscode.workspace.getConfiguration("fountain.general", document.uri).get<boolean>("synopsisVisibleWhenFolding", false);

			function addRange(structItem: StructToken, nextStructItem: StructToken, lastline: number) {
				if (structItem.isnote) return;
				if (nextStructItem != undefined)
					lastline = nextStructItem.range.start.line;
				let startLine = structItem.range.start.line;
				const endLine = lastline - 1;
				if (synopsisVisible && structItem.synopses && structItem.synopses.length > 0) {
					const lastSynopsisLine = structItem.synopses[structItem.synopses.length - 1].line;
					startLine = lastSynopsisLine + 1;
				}
				if (startLine <= endLine) {
					ranges.push(new vscode.FoldingRange(startLine, endLine));
				}

				if (structItem.children && structItem.children.length) {
					for (let i = 0; i < structItem.children.length; i++) {
						addRange(structItem.children[i], structItem.children[i + 1], lastline);
					}
				}
			}

			let parsed = parsedDocuments.get(document.uri.toString());
			for (let i = 0; i < parsed.properties.structure.length; i++) {
				addRange(parsed.properties.structure[i], parsed.properties.structure[i + 1], document.lineCount);
			}
		}
		return ranges;
	}
}