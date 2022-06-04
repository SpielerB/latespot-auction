import {BigNumber, BigNumberish, Contract, ethers, Signer} from 'ethers';
import ContractData from '../app/model/ContractData';
import {sleep} from './TimingHelper';
import PhaseData from '../app/model/PhaseData';

const zero = BigNumber.from(0);

const defaultPhaseData: PhaseData = {
    active: false,
    stopped: false,
    ticketSupply: 0,
    ticketCount: 0,
    ticketsPerWallet: 0
};

export const importToken = (provider: ethers.providers.JsonRpcProvider, address: string, symbol: string) => {
    provider?.send('wallet_watchAsset', {type: 'ERC20', options: {address, symbol, decimals: 0}} as unknown as any[]); // Casting because ethers provides the wrong type for params (needs object for this)
}

export const buyTickets = async (amount: number, signer: Signer, contractData: ContractData, contract: Contract) => {
    const address = await signer?.getAddress();
    const value = contractData?.price.mul(amount);

    const signatureResponse = await fetch('https://api.squirreldegens.com/api', {
        method: 'POST',
        body: JSON.stringify({address, value}),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const signature = await signatureResponse.text();
    let tx;
    switch (contractData.currentPhase) {
        case 1:
            tx = await contract?.buyPhaseOne(signature, {value});
            break;
        case 2:
            tx = await contract?.buyPhaseTwo(signature, {value});
            break;
        case 3:
            tx = await contract?.buyPhaseThree(signature, {value});
            break;
    }
    await tx.wait();
}

const convertPhaseData = (phaseData: any): PhaseData => {
    return {
        ...phaseData,
        ticketSupply: phaseData.ticketSupply.toNumber(),
        ticketCount: phaseData.ticketCount.toNumber(),
        ticketsPerWallet: phaseData.ticketsPerWallet.toNumber()
    }
}

export const loadPhaseData = async (contract: Contract): Promise<PhaseData[]> => {
    const phases: PhaseData[] = [defaultPhaseData];
    phases[1] = convertPhaseData(await contract.phaseOneData());
    phases[2] = convertPhaseData(await contract.phaseTwoData());
    phases[3] = convertPhaseData(await contract.phaseThreeData());
    return phases;
}

export const loadPrice = async (contract: Contract, phase: number) => {
    switch (phase) {
        case 1:
            return await contract.nextBlockPricePhaseOne();
        case 2:
            return await contract.phaseTwoPrice();
        case 3:
            return await contract.phaseThreePrice();
    }
    return zero;
}

export const loadContractData = async (contract: Contract): Promise<ContractData> => {
    const phaseTickets = contract.getPhaseTickets();
    const tickets = contract.getTickets();
    const ticketCount = contract.ticketCount();
    const totalSupply = contract.totalSupply();
    const whitelisted = contract.whitelisted();
    const name = contract.name();
    const symbol = contract.symbol();

    const phase = (await contract.currentPhase()).toNumber();
    const price = await loadPrice(contract, phase);

    const phaseData = await loadPhaseData(contract);

    const etherPrice = fixEther(price);

    return {
        price,
        etherPrice,
        phaseData,
        tokenName: await name,
        tokenSymbol: await symbol,
        currentPhaseData: phaseData[phase],
        currentPhase: phase,
        totalCount: (await ticketCount).toNumber(),
        totalSupply: (await totalSupply).toNumber(),
        walletData: {
            tickets: (await tickets).toNumber(),
            phaseTickets: (await phaseTickets).toNumber(),
            whitelisted: await whitelisted
        }
    };
}

export const fixEther = (wei?: BigNumberish) => (+ethers.utils.formatEther(wei || zero))
    .toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3});


let contractPromise: Promise<Contract | undefined> | undefined;
/**
 * Loads the contract information from the backend and creates a local Contract object for future use.
 * Only the first request to this method should actually try to load the contract.
 * After the successful fetch and creation of the contract, a new load request may be started.
 **/
export const awaitContract = async (signer: Signer, signal: AbortSignal): Promise<Contract | undefined> => {
    if (contractPromise) return await contractPromise;
    return contractPromise = new Promise<Contract | undefined>(async resolve => {
        let contract;
        try {
            let data: any;
            while (!signal.aborted && !data) {
                try {
                    const response = await fetch('https://api.squirreldegens.com/api');
                    if (response.status === 200) {
                        const json = await response.json();
                        if (json.started && json.contractAddress && json.abi) {
                            data = json;
                        }
                    }
                } catch (ignored) {}
                if (!data) {
                    await sleep(2000);
                }
            }

            const newContractAddress = data.contractAddress;
            const abi = data.abi;
            contract = new ethers.Contract(newContractAddress, abi, signer)
        } finally {
            resolve(contract);
            contractPromise = undefined;
        }
    });
}

export const hasAuctionEnded = ({currentPhase, phaseData}: ContractData): boolean => {
    return currentPhase === 0
        && phaseData[1].active && phaseData[2].active && phaseData[3].active
        && phaseData[3].ticketCount === phaseData[3].ticketSupply;
}