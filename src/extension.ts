// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Contract, ethers } from 'ethers';
import { Fragment } from 'ethers/lib/utils';
import { ExtensionContext, languages, commands, Disposable, workspace, window } from 'vscode';
import { CodelensProvider } from './CodelensProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {
    const codelensProvider = new CodelensProvider();

    languages.registerCodeLensProvider("*", codelensProvider);

    commands.registerCommand("codelens-sample.enableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", true, true);
    });

    commands.registerCommand("codelens-sample.disableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", false, true);
    });

    commands.registerCommand("codelens-sample.codelensAction", async (contractAddress: string, funcSig: any) => {

        console.log(contractAddress);
        console.log(funcSig);

        const func = Fragment.from(funcSig);
        // console.log(.functions);
        // const funcName = func.name;

        console.log(func.name);

        const provider = new ethers.providers.JsonRpcProvider(' https://api.avax-test.network/ext/bc/C/rpc');
        const contract = new Contract(contractAddress, [func], provider);
        // window.

        const result = await contract.functions[func.name]();

        window.showInformationMessage(`CodeLens action clicked with args=${result}`);

    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (disposables) {
        disposables.forEach(item => item.dispose());
    }
    disposables = [];
}
