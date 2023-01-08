import {createAction, createReducer, Dispatch} from '@reduxjs/toolkit';
import ContractData from '../../model/ContractData';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import {deepEqual} from 'wagmi';

export const updateContractData = createAction<ContractData>("contractData/update");

let fetching = false;
export const fetchContractData = () => async (dispatch: Dispatch, getStore: () => RootState) => {
    if (fetching) return;
    fetching = true;

    const fetchContractData = async () => {
        try {
            const response = await fetch("http://localhost:5000/")
            const data = await response.json();
            if (!deepEqual(getStore().contractData, data)) {
                dispatch(updateContractData(data));
            }
        } catch (error) {
            console.error(error);
        }
        setTimeout(fetchContractData, 5000);
    }

    await fetchContractData()
}

const initialState: ContractData = {
    started: false
};

const reducer = createReducer(initialState, builder => {
    builder.addCase(updateContractData, (state, action) => {
        state.started = action.payload.started;
        state.contractAddress = action.payload.contractAddress;
        state.abi = action.payload.abi;
    });
});

export const useContractData = () => createSelectorHook()((state: RootState) => state.contractData);
export default reducer;