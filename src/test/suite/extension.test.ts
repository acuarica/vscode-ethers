import * as assert from 'assert';
import { after } from 'mocha';

import * as vscode from 'vscode';
import { commands, Position, Selection, TextEditor } from 'vscode';

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function typewrite(editor: TextEditor, start: Position, text: string, ms = 80) {
    let pos = start;
    for (const c of text) {
        await editor.edit(
            function (b: vscode.TextEditorEdit) {
                b.insert(pos, c);
            }
        );
        if (c === '\n') {
            pos = new Position(pos.line + 1, 0);
        } else {
            pos = new Position(pos.line, pos.character + 1);
        }
        await wait(ms);
    }

    await wait(1000);

    return pos;
}

function hoverAt(editor: TextEditor, position: Position) {
    editor.selection = new Selection(position, position);
    vscode.commands.executeCommand('editor.action.showHover');
}

suite('Extension Test Suite', () => {
    after(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Sample test', async () => {
        const document = await vscode.workspace.openTextDocument({ language: 'ethers' });
        const editor = await vscode.window.showTextDocument(document);

        let pos = new Position(0, 0);
        pos = await typewrite(editor, pos, `\n`);

        pos = await typewrite(editor, pos, `net fuji\n\n`);
        // hoverAt(editor, pos.translate(-2));
        pos = await typewrite(editor, pos, `0x5425890298aed601595a70AB815c96711a31Bc65`, 20);

        pos = await typewrite(editor, pos, ` as usdc\n\n`,);
        pos = await typewrite(editor, pos, `net goerli\n\n`);

        await wait(10000);

        commands.executeCommand('workbench.action.closeActiveEditor');

        await wait(500);

        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});
