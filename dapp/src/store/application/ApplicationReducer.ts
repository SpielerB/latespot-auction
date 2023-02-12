import {createAction, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import DisplayState from '../../model/DisplayState';
import ModalTarget from '../../model/ModalTarget';
import ApplicationState from '../../model/ApplicationState';

export const setDisplayState = createAction<DisplayState>("display/state/set");
export const openModal = createAction<ModalTarget>("modal/open");
export const closeModal = createAction("modal/close");

const initialState = {
    displayState: DisplayState.DISCONNECTED,
    modalOpen: false,
    modalTarget: ModalTarget.AUCTION
};

const reducer = createReducer<ApplicationState>(initialState, builder => {
    builder.addCase(setDisplayState, (state, action) => {
        state.displayState = action.payload;
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
export const useDisplayState = (): DisplayState => createSelectorHook()((state: RootState) => state.application.displayState);
export const useModalOpen = () => createSelectorHook()((state: RootState) => state.application.modalOpen);
export const useModalTarget = () => createSelectorHook()((state: RootState) => state.application.modalTarget);

export default reducer;