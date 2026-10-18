const { addTypesReference } = require('@alessiofrittoli/node-scripts/postinstall')
const project = require('../../package.json')

/** @type {import( '@alessiofrittoli/chain-functions/types' ).ChainLink<() => void | Promise<void>>} */
const tsSetup = next => () => {
	addTypesReference({
		name: project.name,
		scopes: [`${project.name}/globals`],
	})

	return next()
}

module.exports = tsSetup
