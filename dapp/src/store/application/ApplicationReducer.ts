import {createAction, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import DisplayState from '../../model/DisplayState';
import ModalTarget from '../../model/ModalTarget';
import ApplicationState from '../../model/ApplicationState';

export const setContractState = createAction<DisplayState>("application/state/set");
export const openModal = createAction<ModalTarget>("application/modal/open");
export const closeModal = createAction("application/modal/close");

const initialState = {
    contractState: DisplayState.DISCONNECTED,
    modalOpen: false,
    modalTarget: ModalTarget.AUCTION
};

const reducer = createReducer<ApplicationState>(initialState, builder => {
    builder.addCase(setContractState, (state, action) => {
        state.state = action.payload;
    });
    builder.addCase(openModal, (state, action) => {
        state.modalOpen = true;
        state.modalTarget = action.payload;
    });
    builder.addCase(closeModal, (state) => {
        state.modalOpen = false;
    });
});

export const useApplication = () => createSelectorHook()((state: RootState) => state.application);
export const useDisplayState = (): DisplayState => createSelectorHook()((state: RootState) => state.application.state);
export const useModalOpen = () => createSelectorHook()((state: RootState) => state.application.modalOpen);
export const useModalTarget = () => createSelectorHook()((state: RootState) => state.application.modalTarget);

export default reducer;