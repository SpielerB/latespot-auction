import {useSigner} from './WalletHooks';
import {useContract as useWagmiContract} from 'wagmi';
import {useContractMetadata} from '../store/contract/ContractReducer';

export const useEtherContract = () => {
    const signerOrProvider = useSigner();
    const {started, contractAddress, abi} = useContractMetadata();
    const contract = useWagmiContract({address: contractAddress, abi, signerOrProvider})
    return signerOrProvider && started ? contract : undefined;
}