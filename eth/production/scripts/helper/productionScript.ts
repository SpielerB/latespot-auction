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

let contractInstance: Contract | undefined;
export const contract = () => {

}