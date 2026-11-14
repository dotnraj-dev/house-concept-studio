import { defineConfig } from 'vite';

export default defineConfig({
  server: { port:5173, strictPort:true, proxy:{'/api':'http://127.0.0.1:3001'},
    watch:{ignored:['**/.work/**','**/.local_pg/**','**/.secrets/**','**/render-output/**','**/uploads/**']},
    fs:{deny:['.env','.env.*','**/.git/**','**/.secrets/**','**/.local_pg/**','**/.work/**','**/render-output/**']}
  },
  build:{outDir:'dist',rollupOptions:{output:{manualChunks:{react:['react','react-dom'],three:['three'],icons:['lucide-react']}}}},
});
