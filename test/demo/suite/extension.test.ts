import * as assert from 'assert';
import { after, beforeEach } from 'mocha';
import { commands, Position, Selection, TextEditor, TextEditorEdit, window, workspace } from 'vscode';

const output = window.createOutputChannel('Ethers Mode - Demo');
output.show(true);
// output.appendLine('Here you see ');

async function info(message: string) {
    output.appendLine(message);
    await wait(500);
}

suite('Extension Test Suite', () => {
    after(() => {
        window.showInformationMessage('All tests done!');
    });

    beforeEach(() => {
        commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('Ethers Mode commands should be available only in Ether Mode lang', async () => {
        await info('`Ethers Mode` commands should not be available when no editor is open');
        await commands.executeCommand('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await commands.executeCommand('workbench.action.closeQuickOpen');

        await info('`Ethers Mode` commands should not be available when editor is not `ethers` language');
        await showDocument('plaintext');
        await commands.executeCommand('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await commands.executeCommand('workbench.action.closeQuickOpen');

        await info('Instead, `Ethers Mode` commands should be available when editor is `ethers` language');
        await showDocument();
        await commands.executeCommand('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await commands.executeCommand('workbench.action.closeQuickOpen');
    });

    test('Sample test', async () => {
        const editor = await showDocument();

        let pos = new Position(0, 0);
        pos = await typewrite(editor, pos, `\n`);

        pos = await typewrite(editor, pos, `net fuji\n\n`);
        hoverAt(editor, pos.translate(-2));
        pos = await typewrite(editor, pos, `0x5425890298aed601595a70AB815c96711a31Bc65`, 20);

        pos = await typewrite(editor, pos, ` as usdc\n\n`,);
        pos = await typewrite(editor, pos, `net goerli\n\n`);

        await wait(10000);

        commands.executeCommand('workbench.action.closeActiveEditor');

        await wait(500);

        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function typewrite(editor: TextEditor, start: Position, text: string, ms = 80) {
    let pos = start;
    for (const c of text) {
        await editor.edit(
            function (b: TextEditorEdit) {
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
    commands.executeCommand('editor.action.showHover');
}

async function showDocument(language = 'ethers') {
    const document = await workspace.openTextDocument({ language });
    const editor = await window.showTextDocument(document);
    return editor;
}
