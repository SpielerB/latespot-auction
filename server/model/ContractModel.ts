import MintModel from './MintModel';

export default interface ContractModel {
    privateMint: MintModel;
    publicMint: MintModel;
    tokensRevealed: boolean;
    mintedTokens: 0;
    balance: 0;
    whitelisted: false;
}