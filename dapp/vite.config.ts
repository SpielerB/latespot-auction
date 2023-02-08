import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                entryFileNames: "[name].js",
                assetFileNames: "assets/[name].[ext]",
            },
        }
    },
    resolve: {
        mainFields: []
    }
})
