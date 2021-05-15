import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

export function flatten<T>(array: ReadonlyArray<T>[]): T[] {
    return Array.prototype.concat.apply([], array);
}

interface IErrorOutput {
    ename: string;
    evalue: string;
}

async function insertPipInstallCell(editor: vscode.NotebookEditor, cell: vscode.NotebookCell, moduleName: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replaceNotebookCells(
        editor.document.uri,
        new vscode.NotebookRange(cell.index, cell.index),
        [new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '!pip install ' + moduleName, 'python', [], undefined, undefined)]
    );
    await vscode.workspace.applyEdit(edit);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('bje.installModule', async (arg) => {
        if (!arg) {
            return;
        }

        const activeEditor = vscode.window.activeNotebookEditor;
        if (!activeEditor) {
            return;
        }

        const cellMatch = (cell: vscode.NotebookCell) => {
            if (!cell.outputs.length) {
                return false;
            }

            return cell.outputs.findIndex(output => {
                return output.outputs.findIndex(item => {
                    return item.mime === 'application/x.notebook.error-traceback' && (item.value as IErrorOutput).ename === 'ModuleNotFoundError' && (item.value as IErrorOutput).evalue === `No module named '${arg}'`
                }) > -1;
            }) > -1;
        }

        const document = activeEditor.document;
        for (let i = 0; i < activeEditor.selections.length; i++) {
            const range = activeEditor.selections[i];
            const findIndex = activeEditor.document.getCells(range).findIndex(cell => cellMatch(cell));
            if (findIndex > -1) {
                const currCell = document.cellAt(range.start + findIndex);
                return insertPipInstallCell(activeEditor, currCell, arg);
            }
        }

        for (let i = 0; i < activeEditor.visibleRanges.length; i++) {
            const range = activeEditor.visibleRanges[i];
            const findIndex = activeEditor.document.getCells(range).findIndex(cell => cellMatch(cell));
            if (findIndex > -1) {
                const currCell = document.cellAt(range.start + findIndex);
                return insertPipInstallCell(activeEditor, currCell, arg);
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('bje.revealrange', (arg) => {
        const activeEditor = vscode.window.activeNotebookEditor;
        if (!activeEditor) {
            return;
        }

        if (!arg) {
            return;
        }

        const parsedArgs = arg.split(/,/);
        if (parsedArgs.length !== 2) {
            return;
        }

        const fileName = String(parsedArgs[0]);

        const inputIndexMatches = /^\<ipython-input-(\d)/.exec(fileName);
        if (inputIndexMatches && inputIndexMatches.length === 2) {
            // it's cell input
            const executionCount = Number(inputIndexMatches[1]);
            const ln = Number(parsedArgs[1]);
            const document = activeEditor.document;

            const cell = document.getCells().find((cell: vscode.NotebookCell) => {
                return cell.executionSummary?.executionOrder === executionCount;
            });
    
            if (cell) {
                vscode.commands.executeCommand('vscode.open', cell.document.uri, {
                    selection: new vscode.Range(ln - 1, 0, ln - 1, 0)
                });
            }

            return;
        }

        const otherFileName = /(\~.*\.py)/.exec(fileName);
        if (otherFileName && otherFileName.length === 2) {
            const filePath = otherFileName[1];
            const ln = Number(parsedArgs[1]);
            let filePathUri: vscode.Uri;
            if (filePath[0] === '~') {
                filePathUri = vscode.Uri.file(path.join(os.homedir(), filePath.slice(1)));
            } else {
                filePathUri = vscode.Uri.file(filePath);
            }
            vscode.commands.executeCommand('vscode.open', filePathUri, {
                selection: new vscode.Range(ln - 1, 0, ln - 1, 0)
            });
        }

    }));

}

// This method is called when your extension is deactivated
export function deactivate() { }
