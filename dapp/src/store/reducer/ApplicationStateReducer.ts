import {createAction, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import ApplicationState from '../../model/ApplicationState';

export const setApplicationState = createAction<ApplicationState>("applicationState/set");

const initialState = {
    applicationState: ApplicationState.DISCONNECTED
};

const reducer = createReducer(initialState, builder => {
    builder.addCase(setApplicationState, (state, action) => {
        state.applicationState = action.payload;
    });
});

export const useApplicationState = () => createSelectorHook()((state: RootState) => state.applicationState.applicationState);

export default reducer;