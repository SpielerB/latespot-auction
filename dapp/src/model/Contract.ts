import Auction from './Auction';

export default interface Contract {
    privateAuction: Auction;
    publicAuction: Auction;
    tokensMinted: boolean;
    tokensRevealed: boolean;
    walletTickets: number;
    stakingLevels: number[]
    whitelisted: boolean;
}