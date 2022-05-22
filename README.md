# VS Code Ethers Mode

[![marketplace](https://vsmarketplacebadge.apphb.com/version-short/acuarica.ethers-mode.svg)](https://marketplace.visualstudio.com/items?itemName=acuarica.ethers-mode)
[![installs](https://vsmarketplacebadge.apphb.com/installs/acuarica.ethers-mode.svg)](https://marketplace.visualstudio.com/items?itemName=acuarica.ethers-mode)
[![downloads](https://vsmarketplacebadge.apphb.com/downloads/acuarica.ethers-mode.svg)](https://marketplace.visualstudio.com/items?itemName=acuarica.ethers-mode)
[![rating](https://vsmarketplacebadge.apphb.com/rating-star/acuarica.ethers-mode.svg)](https://marketplace.visualstudio.com/items?itemName=acuarica.ethers-mode)

Ethers Mode allows you to explore and call Smart Contracts methods using [Ethers.js](https://docs.ethers.io/v5/) and view the response directly in VS Code.
It interacts with any EVM-compatible blockchain, _e.g._, Ethereum, Polygon, Avalanche, _etc_.
It uses VS CodeLens to display contextual information about Contracts, Externally Owned Accounts and networks.

![preview](https://user-images.githubusercontent.com/4592980/166147485-ae00599b-d6c0-456b-9777-0a42706cbf9a.gif)

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

![preview-aliases](https://user-images.githubusercontent.com/4592980/166147504-f41a8a57-e628-4ab2-8503-e93eece2406b.gif)

### Hovers & Decompile

Provide connection info and decompilation of smart contracts.

![preview-decompile](https://user-images.githubusercontent.com/4592980/166395723-64519b4a-2648-4e05-aeab-3f2a1c6c3226.gif)

### Sending and Signing Transactions

To send and sign transactions,
you can provide a private key for an account.
The address will be displayed as a code lens.

![preview-signing](https://user-images.githubusercontent.com/4592980/166147513-e9670847-92b1-4380-84b7-d6c03b51e0d4.gif)

### Display inferred types

When you omit the type of an argument, it will display an inlay with the inferred type.

![preview-inlays](https://user-images.githubusercontent.com/4592980/166147364-ddbd652d-e284-4927-85d1-5b92e61c1c1b.gif)

### Blocks and Ether CashFlow

![preview-cashflow](https://user-images.githubusercontent.com/4592980/169706483-10d8a1b1-1af1-470f-b76d-35d6dbf6ac05.gif)

### Snippets

When you know that a contract implements a specific ERC,
you can use snippets to insert its methods.
The errors are caused because on methods that require sending a transaction without specifying a signer.

![preview-snippets](https://user-images.githubusercontent.com/4592980/166147529-7302d0bb-a0bd-469c-9f39-3c4b96ab5157.gif)

### Error Reporting

Whenever there is a syntax error or the method call is inconsistent, _e.g._, trying to send a transaction without a signer, the extension will show provide diagnostics about them.

![preview-errors](https://user-images.githubusercontent.com/4592980/166147549-e28da62b-1376-4ee3-97f2-88c511fcb00f.gif)

### Language Auto Detection

Just write `net <provider>` at the beginning of the file and select
`Change Language Mode -> Auto Detect`.

![preview-autodetect](https://user-images.githubusercontent.com/4592980/166147557-c7e516d3-caa9-40bb-821c-d530bf17915c.gif)

## Contributing

- Execute `yarn install` in terminal to install dependencies
- Execute the `Run Extension` target in the Debug View.
  This will:
  - Start a task `npm: watch` to compile the code
  - Run the extension in a new VS Code window

### Typechecking and Building

To typecheck the extension using `tsc`, run

```sh
yarn compile
```

To build and package the extension we use the `esbuild` bundler.
To bundle the extension into `dist/main.js`, run

```sh
yarn build
```

### Unit Testing

Unit tests can be found under the `test` folder.
Our test suite uses `mocha` to run the tests.

```sh
yarn test
```

### VS Code Testing

**TODO!**

### VS Code API Overview

### `languages` module

The extension uses [`languages.registerCodeLensProvider`](https://code.visualstudio.com/api/references/vscode-api#languages.registerCodeLensProvider)
to register the `CodeLensProvider`.
