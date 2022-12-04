import API from '../app/model/API';
import {createContext, useContext} from 'react';
import MockAPI from './MockAPI';

const APIContext = createContext<API>(MockAPI);

export const APIProvider = APIContext.Provider;

export const useAPI = () => useContext(APIContext);