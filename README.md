# VS Code Ethers Mode

Ethers Mode allows you to call Smart Contracts methods using [Ethers.js](https://docs.ethers.io/v5/) and view the response in Visual Studio Code directly.
It uses VS CodeLens to display contextual information about Contracts, Externally Owned Accounts and networks.

![preview](preview.gif)

## Main Features

- Call Smart Contract method by writing its [Human-Readable ABI Signature](https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917)
- Detect contract or EOA address and provide its balance
- Call multiple Smart Contract methods in a single file
- Send method arguments and autodetect argument types
- View return value as a notification (**CHANGE**)
- Provide network info
- Select multiple network in a single file networks (using `net <network name | RPC URL>`)
- Error reporting as you type
- Alias definitions with `as` and `this`
- Send and sign transactions using private keys
- `Ethers` language support
  - `.ethers` and `.web3` file extensions
  - Syntax highlight of Human-Readable ABI Signatures if Solidity extension is installed
  - TODO Auto completion for method, url, header, custom/system variables, mime types and so on
  - Comments (line starts with `#`) support
  - Code snippets for several ERCs
  - TODO Support navigate to symbol definitions(request and file level custom variable) in open `http` file
  - CodeLens support to add an actionable link to call method
  - CHECK Fold/Unfold for request block

And more

- Auto detect language mode using `net` declaration

## Usage

In a new editor, select a network, followed by a contract address and a method call

```ethers
net fuji

0x5425890298aed601595a70AB815c96711a31Bc65
name() view returns (string)
```

Once you prepared a Smart Contract method call,
click the `Call Smart Contract Method` link above the call
(this will appear if the file's language is `Ethers`, by default `.ethers` and `.web3` files are like this).

## Features

### Aliases

You can define aliases using the `as` keyword.
These aliases can be used to reference the aliased address within another address.
Moreover, you can use the `this` reference to use the address in the current scope.

![preview-aliases](preview-aliases.gif)

### Sending and Signing Transactions

To send and sign transactions,
you can provide a private key for an account.
The address will be displayed as a code lens.

![preview-signing](preview-signing.gif)

### Snippets

When you know that a contract implements a specific ERC,
you can use snippets to insert its methods.
The errors are caused because on methods that require sending a transaction without specifying a signer.

![preview-snippets](preview-snippets.gif)

### Error Reporting

Whenever there is a syntax error or the method call is inconsistent, _e.g._, trying to send a transaction without a signer, the extension will show provide diagnostics about them.

![preview-errors](preview-errors.gif)

### Language Auto Detection

Just write `net <provider>` at the beginning of the file and select
`Change Language Mode -> Auto Detect`.

![preview-autodetect](preview-autodetect.gif)

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
