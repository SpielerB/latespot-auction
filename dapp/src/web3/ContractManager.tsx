import {setContractState, useDisplayState} from '../store/application/ApplicationReducer';
import {useAppDispatch} from '../store/Store';
import {useEffect} from 'react';
import DisplayState from '../model/DisplayState';
import {useEtherContract} from '../hooks/ContractHooks';
import {updateContractMetadata, updateContractSyncLoop, useContractMetadata} from '../store/contract/ContractReducer';
import {deepEqual, useAccount} from 'wagmi';

const ContractManager = () => {
    const dispatch = useAppDispatch();
    const account = useAccount();
    const contract = useEtherContract();
    const localMetadata = useContractMetadata();
    const contractState = useDisplayState();

    useEffect(() => {
        if (contractState !== DisplayState.DISCONNECTED) {
            let cancelled = false;
            const fetchContractData = async () => {
                if (cancelled) {
                    return;
                }
                try {
                    const response = await fetch(import.meta.env.VITE_API_URL);
                    const remoteMetadata = await response.json();
                    if (cancelled) {
                        return;
                    }
                    if (!deepEqual(remoteMetadata, localMetadata)) {
                        dispatch(updateContractMetadata(remoteMetadata));
                        if (localMetadata.started && !remoteMetadata.started) {
                            dispatch(setContractState(DisplayState.PRE_AUCTION));
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
                if (!cancelled) {
                    setTimeout(fetchContractData, 10000);
                }
            }

            const timeoutId = setTimeout(fetchContractData, 0);
            return () => {
                cancelled = true;
                clearTimeout(timeoutId);
            }
        }
    }, [contractState, localMetadata])

    useEffect(() => {
        if ((account.isConnecting || account.isReconnecting || account.isDisconnected || !account.isConnected) && contractState !== DisplayState.DISCONNECTED) {
            dispatch(setContractState(DisplayState.DISCONNECTED));
        }
        if (account.isConnected && !account.isReconnecting && contractState === DisplayState.DISCONNECTED) {
            dispatch(setContractState(DisplayState.PRE_AUCTION));
        }
    }, [account, contractState])

    useEffect(() => {
        dispatch(updateContractSyncLoop(contract))
    }, [contract]);

    return null;
}

export default ContractManager;