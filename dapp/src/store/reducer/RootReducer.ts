import {combineReducers} from '@reduxjs/toolkit';
import ContractDataReducer from './ContractDataReducer';
import ContractReducer from './ContractReducer';
import ModalReducer from './ModalReducer';
import ApplicationStateReducer from './ApplicationStateReducer';

const RootReducer = combineReducers({
    applicationState: ApplicationStateReducer,
    contract: ContractReducer,
    contractData: ContractDataReducer,
    modal: ModalReducer
});

export default RootReducer;