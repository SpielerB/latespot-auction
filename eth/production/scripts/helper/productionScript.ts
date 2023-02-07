import {config} from 'dotenv';
import * as path from 'path';
import {Contract, ContractTransaction} from 'ethers';

config({
    path: path.resolve(process.cwd(), "eth/production/.env.production"),
    override: true
});

export const waitFor = async (transactionPromise: Promise<ContractTransaction>) => {
    await (await transactionPromise).wait();
}

export const ensureEnv = (key: string): string => {
    const value = process.env[key];
    if (value === undefined) throw `Environment variable '${key}' is not defined`;
    return value;
}

let contractInstance: Contract | undefined;
export const contract = () => {

}