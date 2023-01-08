import {BigNumber} from 'ethers';
import PhaseData from './PhaseData';
import WalletData from './WalletData';

export default interface ContractData {
    tokenName: string;
    tokenSymbol: string;
    currentPhase: number;
    phaseData: PhaseData[];
    currentPhaseData: PhaseData;
    price: BigNumber;
    etherPrice: string;
    totalCount: number;
    totalSupply: number;
    walletData: WalletData;
}