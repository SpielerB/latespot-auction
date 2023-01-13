import {createAction, createAsyncThunk, createReducer, Dispatch} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import Contract from '../../model/Contract';
import {BigNumber, Contract as EthersContract} from 'ethers'
import {deepEqual} from 'wagmi';
import DisplayState from '../../model/DisplayState';
import {setContractState} from '../application/ApplicationReducer';
import ContractState from '../../model/ContractState';
import ContractMetadata from '../../model/ContractMetadata';


let syncedContract: EthersContract | undefined | null;

export const updateContractModel = createAction<Contract | undefined>("contract/model/update");

export const syncContract = createAsyncThunk<Contract | undefined>("contract/model/sync", async () => {
    if (!syncedContract) return undefined;
    return await internalContractSync(syncedContract);
})

export const buyTickets = createAsyncThunk<void, number, { state: RootState }>("contract/function/buy", async (ticketCount, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    if (ticketCount <= 0) throw "You must buy at least one ticket";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    const isPrivateAuctionActive = model.privateAuction.isActive;
    const isPublicAuctionActive = model.publicAuction.isActive;

    if (!isPublicAuctionActive && !isPrivateAuctionActive) throw "No active auction.";
    const price = BigNumber.from(isPrivateAuctionActive ? model.privateAuction.price : model.publicAuction.price);
    const value = price.mul(ticketCount);
    const address = await syncedContract.signer.getAddress();

    const response = await fetch(`${import.meta.env.VITE_API_URL}/sign`, {
        method: "POST",
        body: JSON.stringify({address, value}),
        headers: {
            "Content-Type": "application/json"
        }
    })
    const signature = await response.text()
    if (isPrivateAuctionActive) {
        await syncedContract.buyPrivateAuction(signature, {value});
    } else {
        await syncedContract.buyPublicAuction(signature, {value});
    }
})

export const updateContractMetadata = createAction<ContractMetadata>("contract/metadata/update");

const internalContractSync = async (contract: EthersContract): Promise<Contract> => {
    // General
    const mintedPromise = contract.minted();
    const revealedPromise = contract.revealed();
    const ticketsPromise = contract.tickets();
    const whitelistedPromise = contract.whitelisted();

    // Private Auction
    const privateStartedPromise = contract.privateAuctionStarted();
    const privateActivePromise = contract.privateAuctionActive();
    const privateStoppedPromise = contract.privateAuctionStopped();
    const privateTicketsPromise = contract.privateAuctionTickets();
    const privateTicketsPerWalletPromise = contract.privateAuctionTicketsPerWallet();
    const privatePricePromise = contract.privateAuctionPrice();
    const privateTicketCountPromise = contract.privateAuctionTicketCount();
    const privateTicketSupplyPromise = contract.privateAuctionTicketSupply();

    // Public Auction
    const publicStartedPromise = contract.publicAuctionStarted();
    const publicActivePromise = contract.publicAuctionActive();
    const publicStoppedPromise = contract.publicAuctionStopped();
    const publicTicketsPromise = contract.publicAuctionTickets();
    const publicTicketsPerWalletPromise = contract.publicAuctionTicketsPerWallet();
    const publicPricePromise = contract.publicAuctionPrice();
    const publicTicketCountPromise = contract.publicAuctionTicketCount();
    const publicTicketSupplyPromise = contract.publicAuctionTicketSupply();

    return {
        privateAuction: {
            hasStarted: await privateStartedPromise,
            isActive: await privateActivePromise,
            hasStopped: await privateStoppedPromise,
            walletTickets: (await privateTicketsPromise).toNumber(),
            ticketsSold: (await privateTicketCountPromise).toNumber(),
            ticketSupply: (await privateTicketSupplyPromise).toNumber(),
            ticketLimit: (await privateTicketsPerWalletPromise).toNumber(),
            price: (await privatePricePromise).toString()
        },
        publicAuction: {
            hasStarted: await publicStartedPromise,
            isActive: await publicActivePromise,
            hasStopped: await publicStoppedPromise,
            walletTickets: (await publicTicketsPromise).toNumber(),
            ticketsSold: (await publicTicketCountPromise).toNumber(),
            ticketSupply: (await publicTicketSupplyPromise).toNumber(),
            ticketLimit: (await publicTicketsPerWalletPromise).toNumber(),
            price: (await publicPricePromise).toString()
        },
        tokensMinted: await mintedPromise,
        tokensRevealed: await revealedPromise,
        walletTickets: (await ticketsPromise).toNumber(),
        tokens: [], // TODO: Implement token fetch
        whitelisted: await whitelistedPromise
    };
}

export const updateContractSyncLoop = (contract: EthersContract | undefined | null) => async (dispatch: Dispatch, getState: () => RootState) => {
    const contractRemoved = syncedContract && !contract
    syncedContract = contract;
    if (!contract) {
        if (contractRemoved) {
            dispatch(updateContractModel(undefined));
        }
        return;
    }
    const syncContractLoop = async () => {
        if (syncedContract !== contract) {
            return;
        }
        const updatedContractModel = await internalContractSync(contract);
        if (syncedContract !== contract) {
            return;
        }
        const existingContractModel = getState().contract.contractModel;
        if (!deepEqual(updatedContractModel, existingContractModel)) {
            dispatch(updateContractModel(updatedContractModel));
            const currentApplicationState = getState().application.state;
            let applicationState = DisplayState.PRE_AUCTION;
            if (updatedContractModel.privateAuction.hasStarted) {
                applicationState = DisplayState.PRIVATE_AUCTION;
            }
            if (updatedContractModel.privateAuction.hasStarted && !updatedContractModel.privateAuction.isActive) {
                applicationState = DisplayState.PRE_PUBLIC_AUCTION;
            }
            if (updatedContractModel.privateAuction.hasStarted && updatedContractModel.publicAuction.hasStarted) {
                applicationState = DisplayState.PUBLIC_AUCTION;
            }
            if (updatedContractModel.publicAuction.hasStarted && !updatedContractModel.publicAuction.isActive) {
                applicationState = DisplayState.PRE_MINT;
            }
            if (updatedContractModel.tokensMinted) {
                applicationState = DisplayState.PRE_REVEAL;
            }
            if (updatedContractModel.tokensRevealed) {
                applicationState = DisplayState.STAKING;
            }
            if (applicationState !== currentApplicationState) {
                dispatch(setContractState(applicationState));
            }
        }
        if (syncedContract === contract) {
            setTimeout(syncContractLoop, 10000);
        }

    };
    setTimeout(syncContractLoop, 0);
}

const initialState: ContractState = {
    metadata: {
        started: false
    }
};

const reducer = createReducer(initialState, builder => {
    builder
        .addCase(updateContractModel, (state, action) => {
            state.contractModel = action.payload;
            state.transactionError = undefined;
        })
        .addCase(syncContract.fulfilled, (state, action) => {
            state.contractModel = action.payload;
            state.transactionError = undefined;
        })
        .addCase(buyTickets.pending, (state) => {
            state.pendingTransaction = true;
            state.transactionError = undefined;
        })
        .addCase(buyTickets.fulfilled, (state) => {
            state.pendingTransaction = false;
            state.transactionError = undefined;
        })
        .addCase(buyTickets.rejected, (state, action) => {
            state.pendingTransaction = false;
            state.transactionError = action.error.message;
        })
        .addCase(updateContractMetadata, (state, action) => {
            state.metadata = action.payload;
            state.transactionError = undefined;
        });
});

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contractModel);
export const useContractMetadata = () => createSelectorHook()((state: RootState) => state.contract.metadata);
export const usePendingTransaction = () => createSelectorHook()((state: RootState) => state.contract.pendingTransaction);
export const useTransactionError = () => createSelectorHook()((state: RootState) => state.contract.transactionError);
export default reducer;