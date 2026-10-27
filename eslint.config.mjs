import { defineConfig } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
export default defineConfig([...next,{rules:{'@next/next/no-img-element':'off','react-hooks/set-state-in-effect':'off','react-hooks/purity':'off','react-hooks/immutability':'off','react-hooks/refs':'off'}}]);
