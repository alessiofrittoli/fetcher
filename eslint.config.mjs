import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Initial file generated with `npm lint -- --init`
 * 
 */

/** @type {import('eslint').Linter.Config[]} */
const config = [
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{ files: [ 'src/**/*.{js,mjs,cjs,ts}' ] },
	{ ignores: [ 'dist', 'coverage', 'scripts' ] },
	{ rules: {
		'@typescript-eslint/no-namespace': 'off',
	} }
]

export default config