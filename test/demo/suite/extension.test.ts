import { after, beforeEach, afterEach } from 'mocha';
import { commands, Position, Selection, TextEditor, TextEditorEdit, window, workspace } from 'vscode';

const output = window.createOutputChannel('Ethers Mode - Demo');
output.show(true);

const cmd = commands.executeCommand;

suite('Extension Test Suite', () => {
    after(() => {
        void window.showInformationMessage('All tests done!');
    });

    beforeEach(async () => {
        await commands.executeCommand('workbench.action.closeAllEditors');
    });

    afterEach(async () => {
        await wait(2000);
    });

    test('Ethers language should be available in Markdown fenced blocks', async () => {
        info('`Ethers` language syntax highlighting should be visible in Markdown fences blocks');

        const editor = new Typewriter(await doc('markdown'));

        await editor.write('# Ethers language in Markdown demo\n\n');

        info('The editor scope should change to `ethers` when entering an `ethers` fenced block');
        await cmd('editor.action.inspectTMScopes');

        await editor.write('```ethers\n\n');
        await editor.write('net fuji');
        await wait(2000);

        await editor.write('\n\n1234');
        await wait(2000);

        await editor.write(`\n\n0x5425890298aed601595a70AB815c96711a31Bc65 as usdc`);
        await wait(2000);

        await editor.write('\n\n```\n');
    });

    test('Ethers Mode commands should be available only in Ether Mode lang', async () => {
        info('`Ethers Mode` commands should not be available when no editor is open');
        await cmd('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await cmd('workbench.action.closeQuickOpen');

        info('`Ethers Mode` commands should not be available when editor is not `ethers` language');
        await doc('plaintext');
        await cmd('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await cmd('workbench.action.closeQuickOpen');

        info('Instead, `Ethers Mode` commands should be available when editor is `ethers` language');
        await doc();
        await cmd('workbench.action.quickOpen', '>Ethers Mode: ');
        await wait(2000);
        await cmd('workbench.action.closeQuickOpen');
    });

    test('Sample test', async () => {
        const editor = await doc();

        let pos = new Position(0, 0);
        pos = await typewrite(editor, pos, `\n`);

        pos = await typewrite(editor, pos, `net fuji\n\n`);
        await hoverAt(editor, pos.translate(-2));
        pos = await typewrite(editor, pos, `0x5425890298aed601595a70AB815c96711a31Bc65`, 20);

        pos = await typewrite(editor, pos, ` as usdc\n\n`);
        pos = await typewrite(editor, pos, `net goerli\n\n`);

        await wait(10000);

        await commands.executeCommand('workbench.action.closeActiveEditor');

        await wait(500);
    });
});

function info(message: string): void {
    output.appendLine(message);
}

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Typewriter {
    pos = new Position(0, 0);

    constructor(readonly editor: TextEditor) {}

    async write(text: string, ms = 80) {
        this.pos = await typewrite(this.editor, this.pos, text, ms);
    }
}

async function typewrite(editor: TextEditor, start: Position, text: string, ms = 80) {
    let pos = start;
    for (const c of text) {
        await editor.edit(function (b: TextEditorEdit) {
            b.insert(pos, c);
        });
        if (c === '\n') {
            pos = new Position(pos.line + 1, 0);
        } else {
            pos = new Position(pos.line, pos.character + 1);
        }
        await wait(ms);
    }

    await wait(800);

    return pos;
}

async function hoverAt(editor: TextEditor, position: Position) {
    editor.selection = new Selection(position, position);
    await commands.executeCommand('editor.action.showHover');
}

async function doc(language = 'ethers'): Promise<TextEditor> {
    const document = await workspace.openTextDocument({ language });
    const editor = await window.showTextDocument(document);
    return editor;
}
