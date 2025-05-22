import { defineConfig } from 'tsup'

const enableSourcemap = process.env.NODE_ENV !== 'production'

export default defineConfig( {
	entry: [
		'src/index.ts', 'src/types.ts', 'src/error.ts',
		'src/fetch.ts', 'src/xhr/index.ts'
	],
	format		: [ 'cjs', 'esm' ],
	dts			: true,
	splitting	: true,
	shims		: true,
	skipNodeModulesBundle: true,
	clean		: true,
	minify		: true,
	sourcemap	: enableSourcemap,
} )