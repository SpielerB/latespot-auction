import {config} from 'dotenv';
import * as path from 'path';
import {Contract, ContractTransaction, Wallet} from 'ethers';
// @ts-ignore
import {ethers, run} from 'hardhat';
import {abi} from '../../../artifacts/contracts/AuctionV2Upgradeable.sol/AuctionV2Upgradeable.json'
import {question} from './question';

config({
    path: path.resolve(process.cwd(), "eth/production/.env.production"),
    override: true
});

export const waitFor = async (transactionPromise: Promise<ContractTransaction>) => {
    await (await transactionPromise).wait();
}

export const ensureEnv = (key: string): string => {
    const value = process.env[key];
    if (value === undefined || value === "") throw `Environment variable '${key}' is not defined`;
    return value;
}

export const createContract = () => {
    const ownerWallet = getOwner();
    const address = ensureEnv("CONTRACT_PROXY_ADDRESS");
    return new Contract(address, abi, ownerWallet);
}

export const getOwner = () => {
    return new Wallet(ensureEnv("CONTRACT_OWNER_PRIVATE_KEY"), ethers.provider);
}

export const verify = async (contract: Contract) => {
    
    console.info("Do you want to verify the contract on etherscan:");
    {
        const response = await question("> ");
        if (response !== "YES") {
            return;
        }
    }

    await run("verify:verify", {
        address: contract.address,
        constructorArguments: []
    })
}