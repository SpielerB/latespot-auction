import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV2Upgradeable.json';

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);

    await contract.requestReveal('https://ipfs.squirreldegens.com/ipfs/QmRcdgCmNb7e5uL3r1Ze8FSrNLUHqrEUA8iwTuLpgShJTE');
    console.log('Revealed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
