import {createAction, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';

export const openModal = createAction("modal/open");
export const closeModal = createAction("modal/close");

const initialState = {
    open: false
};

const reducer = createReducer(initialState, builder => {
    builder.addCase(openModal, (state) => {
        state.open = true;
    });
    builder.addCase(closeModal, (state) => {
        state.open = false;
    });
});

export const useModalState = () => createSelectorHook()((state: RootState) => state.modal);

export default reducer;