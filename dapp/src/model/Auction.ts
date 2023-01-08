import {BigNumber} from 'ethers';

export default interface Auction {
    hasStarted: boolean;
    isActive: boolean;
    hasStopped: boolean;
    walletTickets: number;
    ticketsSold: number;
    ticketSupply: number;
    ticketLimit: number;
    price: BigNumber;
}