/**
 * Represents the public available functions of the contract
 */
import Auction from './Auction';
import Staking from './Staking';

export default interface Contract {
    /**
     * The private auction API
     */
    privateAuction: Auction;

    /**
     * The public action API
     */
    publicAuction: Auction;

    /**
     * Returns true if all the tokens have been minted.
     */
    minted: () => Promise<boolean>;

    /**
     * Returns true if the metadata of the tokens have been revealed
     */
    revealed: () => Promise<boolean>;

    /**
     * Returns the metadata of the given token.
     * Throws an exception if the token does not exist.
     * @param token the id of the token
     */
    metadata: (token: number) => Promise<Metadata>;

    staking: Staking;

    /**
     * Returns the total amount of tickets for the currently connected wallet
     */
    tickets: () => Promise<number>;

    /**
     * Returns a list of tokens currently owned by the connected wallet
     */
    tokens: () => Promise<number[]>;

    /**
     * Returns true of the connected wallet is whitelisted
     */
    whitelisted: () => Promise<boolean>;
}

/**
 * Represents the metadata of a token
 */
export interface Metadata {
    name: string;
    description: string;
    image: string;
    attributes: Attribute[];
    properties: Property[];
    // TBD
}

export interface Attribute {
    // TBD
}

export interface Property {
    // TBD
}