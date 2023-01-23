import {combineReducers, configureStore, Middleware} from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import logger from 'redux-logger'
import {useDispatch} from 'react-redux';
import ApplicationReducer from './application/ApplicationReducer';
import ContractReducer from './contract/ContractReducer';

const additionalMiddlewares: Middleware[] = [thunk];
if (import.meta.env.DEV) {
    additionalMiddlewares.push(logger);
}

export const rootReducer = combineReducers({
    application: ApplicationReducer,
    contract: ContractReducer
});

export type RootState = ReturnType<typeof rootReducer>;

const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(additionalMiddlewares)
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

export default store;