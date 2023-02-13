import {createAction, createAsyncThunk, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import Contract from '../../model/Contract';
import {BigNumber, Contract as EthersContract, ethers} from 'ethers'
import {deepEqual} from 'wagmi';
import DisplayState from '../../model/DisplayState';
import {setDisplayState} from '../application/ApplicationReducer';
import ContractState from '../../model/ContractState';

let syncedContract: EthersContract | undefined | null;
let contractSyncing: boolean = false;

export const updateContractModel = createAction<Contract | undefined>("contract/model/update");

export const syncContractModel = createAsyncThunk<Contract | undefined, void, { state: RootState }>("contract/model/sync", async (ignore, thunkAPI) => {
    const contract = syncedContract;
    const updatedContractModel = await internalContractSync(contract);
    if (syncedContract !== contract) {
        return undefined;
    }
    const existingContractModel = thunkAPI.getState().contract.contractModel;
    if (!deepEqual(updatedContractModel, existingContractModel)) {
        thunkAPI.dispatch(updateContractModel(updatedContractModel));
        const currentApplicationState = thunkAPI.getState().application.displayState;
        let applicationState = DisplayState.PRE_MINT;
        if (updatedContractModel.privateMint.hasStarted) {
            applicationState = DisplayState.PRIVATE_MINT;
        }
        if (updatedContractModel.privateMint.hasStarted && !updatedContractModel.privateMint.isActive) {
            applicationState = DisplayState.PRE_PUBLIC_MINT;
        }
        if (updatedContractModel.privateMint.hasStarted && updatedContractModel.publicMint.hasStarted) {
            applicationState = DisplayState.PUBLIC_MINT;
        }
        if (updatedContractModel.publicMint.hasStarted && !updatedContractModel.publicMint.isActive) {
            applicationState = DisplayState.MINT_FINISHED;
        }
        if (updatedContractModel.tokensRevealed) {
            applicationState = DisplayState.REVEALED;
        }
        if (applicationState !== currentApplicationState) {
            thunkAPI.dispatch(setDisplayState(applicationState));
        }
        return updatedContractModel;
    }
    return existingContractModel;
})

export const updateContractSyncLoop = createAsyncThunk<void, EthersContract | undefined | null, { state: RootState }>("contract/sync/update", async (contract, thunkAPI) => {
    if (contractSyncing && syncedContract === contract) return;
    console.log("Contract changed:", contract)
    syncedContract = contract;
    thunkAPI.dispatch(syncContractModel());

    if (!contractSyncing) {
        console.log("Starting contract sync...")
        contractSyncing = true;
        const syncContractLoop = async () => {
            try {
                await thunkAPI.dispatch(syncContractModel());
            } catch (e) {
                console.error("Error while fetching contract model", e)
            }
            if (syncedContract) {
                setTimeout(syncContractLoop, 5000);
            } else {
                setTimeout(syncContractLoop, 10000);
            }
        };
        if (syncedContract) {
            setTimeout(syncContractLoop, 5000);
        } else {
            setTimeout(syncContractLoop, 10000);
        }
    }
});

const internalContractSync = async (contract: EthersContract | undefined | null): Promise<Contract> => {
    if (contract) {
        return {
            privateMint: {
                hasStarted: await contract.privateMintStarted(),
                isActive: await contract.privateMintActive(),
                hasStopped: await contract.privateMintStopped(),
                walletTokens: (await contract.privateMintTokens()).toNumber(),
                tokensMinted: (await contract.privateMintTokenCount()).toNumber(),
                tokenSupply: (await contract.privateMintSupply()).toNumber(),
                tokenLimit: (await contract.privateMintTokensPerWallet()).toNumber(),
                price: (await contract.privateMintPrice()).toString()
            },
            publicMint: {
                hasStarted: await contract.publicMintStarted(),
                isActive: await contract.publicMintActive(),
                hasStopped: await contract.publicMintStopped(),
                walletTokens: (await contract.publicMintTokens()).toNumber(),
                tokensMinted: (await contract.publicMintTokenCount()).toNumber(),
                tokenSupply: (await contract.publicMintSupply()).toNumber(),
                tokenLimit: (await contract.publicMintTokensPerWallet()).toNumber(),
                price: (await contract.publicMintPrice()).toString()
            },
            tokensRevealed: await contract.revealed(),
            mintedTokens: (await contract.mintedTokenCount()).toNumber(),
            balance: (await contract.balanceOf(await contract.signer.getAddress())).toNumber(),
            whitelisted: await contract.whitelisted()
        };
    } else {
        const response = await fetch(import.meta.env.VITE_API_URL);
        return await response.json();
    }
}

const initialState: ContractState = {
    metadata: {
        started: false
    },
    mintPending: false,
    contractSyncPending: false
};

export const mint = createAsyncThunk<void, number, { state: RootState }>("contract/function/mint", async (tokenCount, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    if (tokenCount <= 0) throw "You must mint at least one token";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    const isPrivateMintActive = model.privateMint.isActive;
    const isPublicMintActive = model.publicMint.isActive;

    if (!isPublicMintActive && !isPrivateMintActive) throw "No active mint.";
    if (isPrivateMintActive && !model.whitelisted) throw "Current wallet not whitelisted";

    const price = BigNumber.from(isPrivateMintActive ? model.privateMint.price : model.publicMint.price);
    const value = price.mul(tokenCount);

    try {
        let transactionPromise;
        if (isPrivateMintActive) {
            transactionPromise = syncedContract.privateMint(tokenCount, {value});
        } else {
            transactionPromise = syncedContract.publicMint(tokenCount, {value});
        }

        const tx = await transactionPromise;
        await tx.wait();
        if (!syncedContract) return;
        await thunkAPI.dispatch(syncContractModel());
    } catch (error: any) {
        if (error?.code === "INSUFFICIENT_FUNDS") {
            throw `The connected wallet does not have enough funds to pay for the mint. ${ethers.utils.formatEther(value)} $ETH + gas fees are required to mint the tokens .`;
        }
    }
})

const reducer = createReducer(initialState, builder => {
    builder
        .addCase(updateContractModel, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(syncContractModel.fulfilled, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(mint.pending, (state) => {
            state.mintPending = true;
        })
        .addCase(mint.fulfilled, (state) => {
            state.mintPending = false;
            state.mintError = undefined;
        })
        .addCase(mint.rejected, (state, action) => {
            state.mintPending = false;
            state.mintError = action.error.message;
        })
});

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contractModel);
export const useContractSyncPending = () => createSelectorHook()((state: RootState) => state.contract.contractSyncPending);
export const useContractMetadata = () => createSelectorHook()((state: RootState) => state.contract.metadata);
export const useMintPending = () => createSelectorHook()((state: RootState) => state.contract.mintPending)
export const useMintError = () => createSelectorHook()((state: RootState) => state.contract.mintError)
export default reducer;