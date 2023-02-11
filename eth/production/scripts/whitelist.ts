import "./helper/productionScript"
import {createContract, ensureEnv} from './helper/productionScript';
import {question} from './helper/question';
import fs from "fs";

async function main() {
    const contract = createContract();
    const fileName = ensureEnv("WHITELIST_FILE");
    const rawWhitelistFile = fs.readFileSync(fileName, "utf-8");
    const whitelist = rawWhitelistFile.split(/\r?\n/);
    const batchSize = +ensureEnv("WHITELIST_BATCH_SIZE");
    const batches = Math.ceil(whitelist.length / batchSize);

    console.info(`You are about to whitelist ${whitelist.length} addresses from ${fileName}.`);
    console.info(`They will be whitelisted in ${batches} batches of ${batchSize} addresses.`);
    console.info("Are you sure you want to do this? Write YES to confirm:")
    {
        const response = await question("> ");
        if (response !== "YES") {
            console.error("Aborted");
            return;
        }
    }

    for (let i = 0; i < batches; ++i) {
        let retry = true;
        while (retry) {
            console.info(`Whitelisting batch #${i + 1} (${i + 1} of ${batches})...`);
            const batch = whitelist.slice(i * batchSize, (i + 1) * batchSize - 1);
            try {
                const tx = await contract.whitelist(batch, {gasPrice: 15_000_000_000});
                console.info("Waiting for confirmation");
                await tx.wait(2);
                retry = false;
            } catch (error) {
                console.error(error);
                console.error(`Failed to whitelist addresses in batch #${i + 1}.`);
                console.error(`This includes the addresses from line ${i * batchSize + 1} to line ${(i + 1) * batchSize}`);
                console.error(`Retrying...`);
            }
        }
    }
    console.info(`${whitelist.length} addresses have been whitelisted`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
