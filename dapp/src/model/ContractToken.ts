export default interface ContractToken {
    /**
     * The id of the token, starts at 1
     */
    id: number;
    /**
     * This field indicates whether this token is staked or not
     */
    staked: boolean;
    /**
     * How long this token has been staked for in seconds (only updates after a block has been mined)
     */
    stakeTime: number;
    /**
     * How long this token has been staked for in seconds (only updates after a block has been mined)
     */
    level: number;
    /**
     * The uri pointing to the metadata file of this token (From which most of the information in this model should stem)
     */
    tokenURI: string;
}