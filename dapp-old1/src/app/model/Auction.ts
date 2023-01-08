/**
 * Represents the auction process of the contract
 */
export default interface Auction {
    /**
     * Buys the given amount of tickets.
     * @param amount the amount to buy
     * @throws If the wallet does not have enough funds
     * @throws If the wallet already has more than the maximum allowed tickets
     * @throws If the amount is 0
     * @throws If the amount if bigger than the maximum allowed tickets per wallet
     */
    buy: (amount: number) => Promise<void>;

    /**
     * Returns true if the auction has started
     */
    hasStarted: () => Promise<boolean>;

    /**
     * Returns true if the auction has been started, has tickets left and has not been stopped
     */
    isActive: () => Promise<boolean>;

    /**
     * Returns true of the auction has been stopped by the owner
     */
    hasStopped: () => Promise<boolean>;

    /**
     * Returns the tickets bought in the current auction by the connected wallet
     */
    tickets: () => Promise<number>;

    /**
     * Returns the tickets bought by all participants of the current auction
     */
    ticketCount: () => Promise<number>;

    /**
     * Returns the total ticket supply of the current auction
     */
    ticketSupply: () => Promise<number>;

    /**
     * Returns the maximum allowed tickets per wallet
     */
    ticketLimit: () => Promise<number>;
}