// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import {ethers, network, upgrades} from 'hardhat';
import fetch from 'node-fetch';
import fs from 'fs';
import {Contract, Wallet} from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const {dirname} = require('path');
const appDir = dirname(require.main?.filename);

interface DeployContract {
    name: string;
    params: (dependingContracts: { [key: string]: Contract }) => any[];
    proxy?: boolean;
    dependsOn?: string[];
    upgrade?: boolean;
}

async function main() {

    const contracts: DeployContract[] = [
        {
            name: "MockChainLink",
            proxy: false,
            params: () => []
        },
        {
            name: 'AuctionV2',
            proxy: false,
            params: ({MockChainLink}) => [
                'LateSpotNFT',
                'LSNFT',
                new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider).address,
                'https://pastebin.com/dl/cH4NfnWU',
                'https://pastebin.com/dl/cH4NfnWU',
                MockChainLink.address,
                42,
                "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
            ],
        },
        {name: 'Greeter', proxy: false, params: () => ['Hello World from hardhat!']},
    ];

    console.log(`Deploying contracts on network '${network.name}'`)
    const {price} = (await (await fetch('https://api.binance.com/api/v3/avgPrice?symbol=ETHBUSD')).json()) as any
    console.log(`Current ETH price: ${price} BUSD`)
    const deployed: { [key: string]: Contract } = {};
    for (const {name, proxy, upgrade, params} of contracts) {
        console.log(`Deploying ${name}`);
        const factory = await ethers.getContractFactory(name);
        let contract;
        if (proxy) {
            if (upgrade) {
                console.log(`${name} will be upgraded`);
                contract = await upgrades.upgradeProxy(params(deployed)[0], factory);

                const tx = await contract.deployTransaction.wait();
                const gasCost = ethers.utils.formatEther(`${tx.effectiveGasPrice.mul(tx.gasUsed)}`);

                console.log(`Contract ${name} updated. (Costs ${gasCost} ETH or ${(+gasCost * price).toFixed(2)} BUSD)`);
                continue;
            }
            console.log(`${name} will be deployed as a proxy`);
            contract = await upgrades.deployProxy(factory, params(deployed));

        } else {
            contract = await factory.deploy(...params(deployed));
        }

        await contract.deployed();
        const tx = await contract.deployTransaction.wait();
        const gasCost = ethers.utils.formatEther(`${tx.effectiveGasPrice.mul(tx.gasUsed)}`);
        console.log(`Contract ${name} deployed to ${contract.address}. (Costs ${gasCost} ETH or ${(+gasCost * price).toFixed(2)} BUSD)`);
        if (appDir) {
            console.log("Saving contract information");
            fs.mkdirSync(`${appDir}/../../server/src/contract/`, {recursive: true});
            fs.mkdirSync(`${appDir}/contract/`, {recursive: true});
            fs.writeFileSync(`${appDir}/../../server/src/contract/${name}.json`, JSON.stringify({address: contract.address}), {flag: "w"});
            fs.writeFileSync(`${appDir}/contract/${name}.json`, JSON.stringify({address: contract.address}), {flag: "w"});
        } else {
            console.error("AppDir unavailable");
        }
        deployed[name] = contract;
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
