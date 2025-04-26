import { defineConfig } from 'tsup'

export default defineConfig( {
	entry		: [ 'src/**/*.ts' ],
	format		: [ 'cjs', 'esm' ],
	dts			: true,
	splitting	: true,
	shims		: true,
	skipNodeModulesBundle: true,
	clean		: true,
	minify		: true,
	sourcemap	: true,
} )