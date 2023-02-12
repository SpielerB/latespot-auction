import {setContractState, useDisplayState} from '../store/application/ApplicationReducer';
import {useAppDispatch} from '../store/Store';
import {useCallback, useEffect} from 'react';
import DisplayState from '../model/DisplayState';
import {useEtherContract} from '../hooks/ContractHooks';
import {syncContractMetadata, updateContractSyncLoop} from '../store/contract/ContractReducer';
import {useAccount} from 'wagmi';
import Cookies from 'js-cookie';

const ContractManager = () => {
    const dispatch = useAppDispatch();
    const onConnect = useCallback(
        async ({address, isReconnected}: { address: `0x${string}`, isReconnected: boolean }) => {
            if (!isReconnected) {
                const referrerId = Cookies.get("__maitre-referrer-MFc19bd28d25");
                if (referrerId) {
                    await fetch('https://app.referralhero.com/api/v2/lists/MFc19bd28d25/subscribers', {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            "referrer": referrerId,
                            "api_token": "95005c9a25b07657446c9640f97f168b68c3df13",
                            "status": "custom_event_pending",
                            "crypto_wallet_address": address,
                            "domain": "https://www.squirreldegens.com/"
                        })
                    });
                }
            }
        }, []);

    const account = useAccount({onConnect});
    const contract = useEtherContract();
    const contractState = useDisplayState();

    useEffect(() => {
        const fetchContractData = async () => {
            dispatch(syncContractMetadata());
            setTimeout(fetchContractData, 10000);
        }

        setTimeout(fetchContractData, 0);
    }, [])

    useEffect(() => {
        if ((account.isConnecting || account.isReconnecting || account.isDisconnected || !account.isConnected) && contractState !== DisplayState.DISCONNECTED) {
            dispatch(setContractState(DisplayState.DISCONNECTED));
        }
        if (account.isConnected && !account.isReconnecting && contractState === DisplayState.DISCONNECTED) {
            dispatch(setContractState(DisplayState.PRE_MINT));
        }
    }, [account, contractState])

    useEffect(() => {
        dispatch(updateContractSyncLoop(contract))
    }, [contract]);

    return null;
}

export default ContractManager;