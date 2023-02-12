import {useAppDispatch} from '../store/Store';
import {useEffect} from 'react';
import {useEtherContract} from '../hooks/ContractHooks';
import {updateContractSyncLoop} from '../store/contract/ContractReducer';
import {useAccount} from 'wagmi';

const ContractManager = () => {
    const dispatch = useAppDispatch();
    const account = useAccount();
    const contract = useEtherContract();

    useEffect(() => {
        if (account.isConnected) {
            dispatch(updateContractSyncLoop(contract))
        } else {
            dispatch(updateContractSyncLoop(undefined))
        }
    }, [contract, account]);

    return null;
}

export default ContractManager;