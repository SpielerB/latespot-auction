export default interface Token {
    id: number;
    name: string;
    description: string;
    image: string;
    staked: boolean;
    attributes: Attributes;
    properties: Property[];
    // TBD
}

export interface Attributes {
    level: number;
}

export interface Property {
    // TBD
}