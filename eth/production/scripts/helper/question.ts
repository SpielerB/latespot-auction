import {createInterface} from "readline";

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

export const question = (questionText: string) => new Promise<string>(resolve => rl.question(questionText, resolve));

export const confirmation = async (...params: string[]) => {
    for (let i = 0; i < params.length; i++) {
        console.info(params[i]);
    }
    console.info("Write 'YES' if you want to continue:");
    const response = await question("> ");
    if (response !== "YES") throw "Confirmation rejected by user.";
}