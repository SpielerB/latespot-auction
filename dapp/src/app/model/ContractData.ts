import {BigNumber} from 'ethers';
import PhaseData from './PhaseData';

export default interface ContractData {
    tokenName: string;
    tokenSymbol: string;
    phase: BigNumber;
    phaseData: PhaseData;
    phaseTickets: BigNumber;
    tickets: BigNumber;
    price: BigNumber;
    etherPrice: string;
    totalCount: BigNumber;
    totalSupply: BigNumber;
    whitelisted: boolean;
}