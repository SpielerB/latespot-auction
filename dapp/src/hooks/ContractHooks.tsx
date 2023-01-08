import {useSigner} from './WalletHooks';
import {useContractData} from '../store/reducer/ContractDataReducer';
import {useContract as useWagmiContract} from 'wagmi';

export const useEtherContract = () => {
    const signerOrProvider = useSigner();
    const {started, contractAddress, abi} = useContractData();
    const contract = useWagmiContract({address: contractAddress, abi, signerOrProvider})
    return signerOrProvider && started ? contract : undefined;
}