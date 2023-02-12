import {createAction, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import DisplayState from '../../model/DisplayState';
import ApplicationState from '../../model/ApplicationState';

export const setDisplayState = createAction<DisplayState>("display/state/set");
export const openModal = createAction("modal/open");
export const closeModal = createAction("modal/close");
export const openDialog = createAction("dialog/open");
export const closeDialog = createAction("dialog/close");

const initialState = {
    displayState: DisplayState.PRE_MINT,
    modalOpen: false,
    dialogOpen: false,
};

const reducer = createReducer<ApplicationState>(initialState, builder => {
    builder.addCase(setDisplayState, (state, action) => {
        state.displayState = action.payload;
    });
    builder.addCase(openModal, (state) => {
        state.modalOpen = true;
    });
    builder.addCase(closeModal, (state) => {
        state.modalOpen = false;
    });
    builder.addCase(openDialog, (state) => {
        state.dialogOpen = true;
    });
    builder.addCase(closeDialog, (state) => {
        state.dialogOpen = false;
    });
});

export const useApplication = () => createSelectorHook()((state: RootState) => state.application);
export const useDisplayState = (): DisplayState => createSelectorHook()((state: RootState) => state.application.displayState);
export const useModalOpen = () => createSelectorHook()((state: RootState) => state.application.modalOpen);
export const useDialogOpen = () => createSelectorHook()((state: RootState) => state.application.dialogOpen);

export default reducer;