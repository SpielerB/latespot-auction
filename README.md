# SquirrelDegens DAPP project

## Setup

### Environment Variables

1. Create a copy named `.env` of each `.env.example` file located in the server, the dapp and the project root.
2. Fill out the variables (if present) in the `.env` files:
    - **SIGNER_PRIVATE_KEY**:
        - Create a new wallet in MetaMask,
        - Export the private key (&bullet;&bullet;&bullet; -> Account Details -> Export Private Key)
        - Paste the key as value
    - **OWNER_PRIVATE_KEY**:
        - Use the private key of the first hardhat account
            - ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        - Or create a new wallet (See SIGNER_PRIVATE_KEY)
3. Check for additional instructions in the READMEs of the subprojects.

## Scripts

The development scripts for this project. These should not be used on the production environment.

### Add funds to wallet (interactive)

```shell
npx hardhat run .\eth\scripts\fund.ts
```

### Whitelist (interactive)

```shell
npx hardhat run .\eth\scripts\whitelist.ts
```

### Start private mint

```shell
npx hardhat run .\eth\scripts\startPrivateMint.ts
```

### Stop private mint

```shell
npx hardhat run .\eth\scripts\stopPrivateMint.ts
```

### Start public mint

```shell
npx hardhat run .\eth\scripts\startPublicMint.ts
```

### Stop public mint

```shell
npx hardhat run .\eth\scripts\stopPublicMint.ts
```

### Mint tokens (Interactive)

```shell
npx hardhat run .\eth\scripts\mint.ts
```

### Define stake levels

```shell
npx hardhat run .\eth\scripts\definedStakeLevels.ts
```

### Reveal metadata (requires stake levels)

```shell
npx hardhat run .\eth\scripts\reveal.ts
```

### Mine blocks (interactive)

Some actions such as staking require blocks to be mined so that the time can move forward.

```shell
npx hardhat run .\eth\scripts\mine.ts
```