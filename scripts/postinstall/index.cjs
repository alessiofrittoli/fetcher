const { Chain } = require('@alessiofrittoli/chain-functions')
const project = require('../../package.json')
const tsSetup = require('./ts-setup.cjs')

/** @type {import( '@alessiofrittoli/chain-functions/types' ).LastChainLink<() => void | Promise<void>>} */
const lastChainLink = () => () => {
	console.log({
		package: project.name,
		message: `Post-Install done. Thank you for installing ${project.name}!`,
	})
}

/** @type {import( '@alessiofrittoli/chain-functions/types' ).ChainFactory<() => void | Promise<void>>} */
const chain = [tsSetup, lastChainLink]

Chain.functions(chain)()
