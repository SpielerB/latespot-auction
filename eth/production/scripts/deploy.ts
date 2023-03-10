import "./helper/productionScript"
import {question} from './helper/question';
import {Wallet} from 'ethers';
import {ensureEnv, verify} from './helper/productionScript';
// @ts-ignore
import {ethers, run, upgrades} from 'hardhat';

async function main() {
    const contractName = "AuctionV2Upgradeable";
    
    const ownerWallet = new Wallet(ensureEnv("CONTRACT_OWNER_PRIVATE_KEY"), ethers.provider);
    const signerWallet = new Wallet(ensureEnv("CONTRACT_SIGNER_PRIVATE_KEY"), ethers.provider);
    const parameters = {
        tokenName: ensureEnv("CONTRACT_PARAMETER_TOKEN_NAME"),
        tokenSymbol: ensureEnv("CONTRACT_PARAMETER_TOKEN_SYMBOL"),
        signerAddress: signerWallet.address,
        baseURI: ensureEnv("CONTRACT_PARAMETER_BASE_URI"),
        contractMetadataURI: ensureEnv("CONTRACT_PARAMETER_CONTRACT_METADATA_URI"),
        linkAddress: ensureEnv("CONTRACT_PARAMETER_LINK_ADDRESS"),
        wrapperAddress: ensureEnv("CONTRACT_PARAMETER_WRAPPER_ADDRESS")
    }
    console.warn(`You are about to deploy the ${contractName} contract with the following parameters:`);
    console.log(`\towner => ${ownerWallet.address}`);
    for (const key of Object.keys(parameters)) {
        console.log(`\t${key} => ${(parameters as any)[key]}`)
    }

    console.info("Write YES if you want to continue:")
    {
        const response = await question("> ");
        if (response !== "YES") {
            console.error("Aborting deployment")
            return;
        }
    }
    console.info("Deploying contract...");

    const factory = await ethers.getContractFactory(contractName, ownerWallet);
    const contract = await upgrades.deployProxy(factory, [
        parameters.tokenName,
        parameters.tokenSymbol,
        parameters.signerAddress,
        parameters.baseURI,
        parameters.contractMetadataURI,
        parameters.linkAddress,
        parameters.wrapperAddress
    ]);

    console.info("Waiting for confirmation...");
    await contract.deployTransaction.wait(6);

    console.info(`Contract deployed to ${contract.address}.`)

    await verify(contract);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
