import {AnyAction, applyMiddleware, configureStore, Dispatch, Middleware} from '@reduxjs/toolkit';
import RootReducer from './reducer/RootReducer';
import {composeWithDevTools} from '@redux-devtools/extension';
import thunk from 'redux-thunk';
import logger from 'redux-logger'

const middleware: Middleware<{}, any, Dispatch<AnyAction>>[] = [thunk];
if (process.env.NODE_ENV === "development") {
    middleware.push(logger);
}

const composedEnhancer = composeWithDevTools(
    // Add whatever middleware you actually want to use here
    applyMiddleware(...middleware)
    // other store enhancers if any
);

const Store = configureStore({
    reducer: RootReducer,
    enhancers: [composedEnhancer]
});

export default Store;
export type RootState = ReturnType<typeof Store.getState>;
export type AppDispatch = typeof Store.dispatch;