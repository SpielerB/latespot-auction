import {createContext, useContext} from 'react';
import API from '../app/model/API';

const APIUpdateContext = createContext<(updatedAPI: API) => void>( (api) => {throw new Error("API updater not implemented")});

export const APIUpdateProvider = APIUpdateContext.Provider;

export const useAPIUpdater = () => useContext(APIUpdateContext);