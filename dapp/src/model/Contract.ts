import Auction from './Auction';
import Token from './Token';

export default interface Contract {
    privateAuction: Auction;
    publicAuction: Auction;
    tokensMinted: boolean;
    tokensRevealed: boolean;
    walletTickets: number;
    tokens: Token[];
    stakingLevels: number[]
    whitelisted: boolean;
}