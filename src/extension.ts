// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Contract, ethers } from 'ethers';
import { Fragment } from 'ethers/lib/utils';
import { ExtensionContext, languages, commands, Disposable, workspace, window, StatusBarAlignment, StatusBarItem, Hover } from 'vscode';
import { CodelensProvider } from './CodelensProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let myStatusBarItem: StatusBarItem;

let disposables: Disposable[] = [];

export function activate({ subscriptions }: ExtensionContext) {
    const codelensProvider = new CodelensProvider();

    languages.registerCodeLensProvider("*", codelensProvider);

    commands.registerCommand("codelens-sample.enableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", true, true);
    });

    commands.registerCommand("codelens-sample.disableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", false, true);
    });

    commands.registerCommand("ethers-mode.callMethod", async (contractAddress: string, funcSig: any) => {
        funcSig = 'function ' + funcSig;

        console.log(contractAddress);
        console.log(funcSig);

        const func = Fragment.from(funcSig);
        // console.log(.functions);
        // const funcName = func.name;

        console.log(func.name);




        const provider = new ethers.providers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
        const contract = new Contract(contractAddress, [func], provider);
        // window.

        const result = await contract.functions[func.name]();

        window.showInformationMessage(`CodeLens action clicked with args=${result}`);

    });




    // register a command that is invoked when the status bar
    // item is selected
    // const myCommandId = 'sample.showSelectionCount';
    // subscriptions.push(vscode.commands.registerCommand(myCommandId, () => {
    // 	const n = getNumberOfSelectedLines(vscode.window.activeTextEditor);
    // 	vscode.window.showInformationMessage(`Yeah, ${n} line(s) selected... Keep going!`);
    // }));

    // create a new status bar item that we can now manage
    myStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    // myStatusBarItem
    // myStatusBarItem.command = myCommandId;
    subscriptions.push(myStatusBarItem);

    // register some listener that make sure the status bar 
    // item always up-to-date
    // subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
    // subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));

    // update status bar item once at start
    updateStatusBarItem();



    languages.registerHoverProvider('*', {
        provideHover(document, position, token) {

            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

            if (word == "HELLO") {

                return new Hover({
                    language: "Hello language",
                    value: "Hello Value"
                });
            }
        }
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (disposables) {
        disposables.forEach(item => item.dispose());
    }
    disposables = [];
}

function updateStatusBarItem(): void {
	const n = 1;
	if (n > 0) {
		myStatusBarItem.text = `$(server-environment) ${n} line(s) selected`;
		myStatusBarItem.show();
	} else {
		myStatusBarItem.hide();
	}
}

// function getNumberOfSelectedLines(editor: vscode.TextEditor | undefined): number {
// 	let lines = 0;
// 	if (editor) {
// 		lines = editor.selections.reduce((prev, curr) => prev + (curr.end.line - curr.start.line), 0);
// 	}
// 	return lines;
// }
