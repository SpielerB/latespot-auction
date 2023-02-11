import "./helper/productionScript"
import {createContract, ensureEnv} from './helper/productionScript';
import {question} from './helper/question';

async function main() {
    const contract = createContract();
    const stakeLevels = [
        +ensureEnv("STAKE_LEVEL_BRONZE"),
        +ensureEnv("STAKE_LEVEL_SILVER"),
        +ensureEnv("STAKE_LEVEL_GOLD")
    ]
    console.info(`You are about to define the following stake levels for ${contract.address}:`);
    console.info(`\t BRONZE => ${stakeLevels[0]}`);
    console.info(`\t SILVER => ${stakeLevels[1]}`);
    console.info(`\t GOLD => ${stakeLevels[2]}`);
    console.info("Are you sure you want to do this? Write YES to confirm:")
    {
        const response = await question("> ");
        if (response !== "YES") {
            console.error("Aborted");
            return;
        }
    }

    console.info("Defining stake levels...")
    const tx = await contract.defineStakeLevels(stakeLevels);
    console.info("Waiting for confirmation");
    await tx.wait(6);
    console.info("Stake levels defined")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
