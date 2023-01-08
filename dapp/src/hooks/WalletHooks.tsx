import {useAccount as useWagmiAccount, useSigner as useWagmiSigner} from 'wagmi';

export const useAddress = () => useWagmiAccount().address;
export const useWalletStatus = () => useWagmiAccount().status;
export const useAccount = () => useWagmiAccount();
export const useSigner = () => {
    const {data: signer, error} = useWagmiSigner();
    return error ? undefined : signer;
}