/**
 * Represents the staking process of the contract
 */
export default interface Staking {
    /**
     * Stakes the given token. Throws an error if the token is already staked or not owned by the connected wallet
     * @param token the id of the token
     */
    stake: (token: number) => Promise<void>;

    /**
     * Returns true if the given token is staked
     * @param token the id of the token
     */
    staked: (token: number) => Promise<boolean>;

    /**
     * Unstakes the given token. Throws an error if the token is not staked or not owned by the connected wallet
     * @param token the id of the token
     */
    unStake: (token: number) => Promise<void>;

    /**
     * Returns the current stake level of the token.
     * The returned value also reflects the level reached of the token is still staked.
     * @param token the id of the token
     */
    stakeLevel: (token: number) => Promise<number>;

    /**
     * Returns the time for which the token has been staked
     * @param token
     */
    stakeTime: (token: number) => Promise<number>;

    /**
     * Returns a list of the durations in seconds to reach a level.
     * Example:
     * [0]: 3600 => 3600 seconds to level 1
     * [1]: 7200 => 7200 seconds to level 2
     */
    stakeLevels: () => Promise<number[]>;
}