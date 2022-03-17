import {BigNumber} from 'ethers';

export default interface PhaseData {
    active: boolean;
    stopped: boolean;
    ticketSupply: BigNumber;
    ticketCount: BigNumber;
    ticketsPerWallet: BigNumber;
}