import ContractData from './ContractData';
import {Contract} from 'ethers';

export default interface UseContract {
    isAvailable: boolean;
    contractData?: ContractData;
    contract?: Contract | null;
}