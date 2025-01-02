const { Chain }	= require( '@alessiofrittoli/chain-functions' )
const tsSetup	= require( './ts-setup.js' )
const project = require( '../../package.json' )

/** @type {import( '@alessiofrittoli/chain-functions/types' ).LastChainLink<() => void | Promise<void>>} */
const lastChainLink = () => () => {
	console.log( {
		package: project.name,
		message: 'Post-Install done'
	  } )
}

/** @type {import( '@alessiofrittoli/chain-functions/types' ).ChainFactory<() => void | Promise<void>>} */
const chain = [ tsSetup, lastChainLink ]

Chain.functions( chain )()