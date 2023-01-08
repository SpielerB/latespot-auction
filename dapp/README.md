# SquirrelDegens DAPP Frontend

This is the manual for the development of the SquirrelDegens dapp frontend.

## Setup

The dapp requires a separate run of `npm install` to function.

We use Vite to locally serve and build the dapp.

## Running

You can use yarn or npm to start the application. After the application has started (should only take a few seconds with
vite), open http://localhost:5173/.

- Use `npm start`, `npm run start` or `npm run dev` to start the local development server
- Use `npm build` to create a production ready build
- Use `npm run preview` to preview a production build

## Redux Sate Logging

Redux-logging is enabled to increase the visibility of state changes in the redux store.
You can disable it by commenting out the following line in `Store.ts`

```
middleware.push(logger);
```
