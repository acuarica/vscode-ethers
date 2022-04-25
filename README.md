# VS Code Ethers Mode

Ethers Mode allows you to call Smart Contracts methods using [Ethers.js](https://docs.ethers.io/v5/) and view the response in Visual Studio Code directly.

![preview](preview.gif)

This is a sample extension that shows the usage of the CodeLens API.

## Main Features

- Call Smart Contract method by writing its [Human-Readable ABI Signature](https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917)
- Syntax Highlighting of Human-Readable ABI Signatures if Solidity extension is installed
- Call multiple Smart Contract methods in a single file
- Send method arguments and autodetect argument types
- View return value as a notification (**CHANGE**)
- Select multiple network in a single file networks (using `net <network name | RPC URL>`)

## Contributing

- Execute `yarn install` in terminal to install dependencies
- Execute the `Run Extension` target in the Debug View.
  This will:
  - Start a task `npm: watch` to compile the code
  - Run the extension in a new VS Code window

### VS Code API Overview

### `languages` module

The extension uses [`languages.registerCodeLensProvider`](https://code.visualstudio.com/api/references/vscode-api#languages.registerCodeLensProvider)
to register the `CodeLensProvider`.
