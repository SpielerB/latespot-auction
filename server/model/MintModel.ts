export default interface MintModel {
    /**
     * If the mint has been started
     */
    hasStarted: boolean;
    /**
     * If the mint is active
     */
    isActive: boolean;
    /**
     * If the mint has been stopped
     */
    hasStopped: boolean;
    /**
     * The tokens minted by the currently connected wallet
     */
    walletTokens: 0;
    /**
     * The tokens minted by everyone
     */
    tokensMinted: number;
    /**
     * The maximum amount of tokens in the current mint
     */
    tokenSupply: number;
    /**
     * The maximum amount of tokens per wallet or transaction
     */
    tokenLimit: number;
    /**
     * The price per minted token
     */
    price: string;
}