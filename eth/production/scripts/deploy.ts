import "./helper/productionScript"
import {network} from 'hardhat';
import question from './helper/question';

async function main() {
    if (network.name === "mainnet") {
        console.warn("You are about to deploy this contract on the Ethereum main network. Write YES if you want to continue");
        const response = await question("> ");
        if (response !== "YES") {
            console.error("Aborting deployment")
            return;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
