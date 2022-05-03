import * as assert from 'assert';
import { after } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Position, Selection } from 'vscode';
// import * as myExtension from '../extension';

suite('Extension Test Suite', () => {
    after(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Sample test', async () => {

        const document = await vscode.workspace.openTextDocument({
            language: 'ethers',
            content: `
net fuji

net goerli

0x0 as ciao
        `
        });

        const editor = await vscode.window.showTextDocument(document);

        // vscode.tests.

        // await editor.edit(
        //     function (b: vscode.TextEditorEdit) {
        //         b.insert(new vscode.Position(0, 0), 'net fuji\n');
        //     }
        // );
        function hoverAt(l: number, c: number) {
            const pos = new Position(l, c);
            editor.selection = new Selection(pos, pos);
            vscode.commands.executeCommand('editor.action.showHover');
        }

        await sleep(2000);
        hoverAt(1, 0);

        await sleep(3000);
        hoverAt(3, 3);



        // await editor.edit(
        //     function (b: vscode.TextEditorEdit) {
        //         b.insert(new vscode.Position(1, 0), 'net goerli\n');
        //     }
        // );
        await sleep(4000);
        vscode.commands.executeCommand('editor.action.showHover');


        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
