export default interface TokenMetadata {
    /**
     * The name of the token
     */
    name: string;
    /**
     * The description of the token
     */
    description: string;
    /**
     * The URL of the image
     */
    image: string;
    /**
     * The attributes of the token
     */
    attributes: Attributes;
    /**
     * The properties of the token
     */
    properties: Property[];
    // TBD
}

export interface Attributes {
    level: number;
}

export interface Property {
    // TBD
}