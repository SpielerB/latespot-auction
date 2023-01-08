import {setApplicationState, useApplicationState} from '../store/reducer/ApplicationStateReducer';
import {useSigner} from '../hooks/WalletHooks';
import {useDispatch} from 'react-redux';
import {AppDispatch} from '../store/Store';
import {useEffect} from 'react';
import {updateContractSyncLoop} from '../store/reducer/ContractReducer';
import ApplicationState from '../model/ApplicationState';
import {useEtherContract} from '../hooks/ContractHooks';

const Web3Manager = () => {
    const contract = useEtherContract();
    const applicationState = useApplicationState();
    const signerOrProvider = useSigner();
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        dispatch(updateContractSyncLoop(contract))
    }, [contract]);

    useEffect(() => {
        if (!signerOrProvider) {
            dispatch(setApplicationState(ApplicationState.DISCONNECTED))
        } else if (applicationState === ApplicationState.DISCONNECTED) {
            dispatch(setApplicationState(ApplicationState.PRE_AUCTION))
        }
    }, [signerOrProvider, applicationState]);

    return null;
}

export default Web3Manager;