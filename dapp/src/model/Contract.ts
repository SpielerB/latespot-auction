import Mint from './Mint';

export default interface Contract {
    privateMint: Mint;
    publicMint: Mint;
    tokensRevealed: boolean;
    mintedTokens: number;
    balance: number;
    stakingLevels: number[]
    whitelisted: boolean;
}