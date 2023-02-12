import {useSigner} from './WalletHooks';
import {useAccount, useContract as useWagmiContract} from 'wagmi';
import {abi, address as localContractAddress} from '../contract/AuctionV3Upgradeable.json'

export const useEtherContract = () => {
    useAccount();
    const signerOrProvider = useSigner();
    const address = import.meta.env.VITE_CONTRACT_ADDRESS && localContractAddress;
    const contract = useWagmiContract({address, abi, signerOrProvider})
    return signerOrProvider ? contract : undefined;
}