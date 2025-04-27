import { isJson } from '@alessiofrittoli/web-utils'
import { binaryToString } from '@alessiofrittoli/crypto-buffer'
import { Exception } from '@alessiofrittoli/exception'


interface GetErrorFromResponseOptions
{
	/** The XML HTTP Request received Response. */
	response: XMLHttpRequest[ 'response' ]
	/** The XML HTTP Request Response Type. */
	responseType: XMLHttpRequestResponseType
}


/**
 * Try getting the Exception received from Response.
 * 
 * @param options An object with the XML HTTP Request received Response and the XML HTTP Request Response Type.
 * @returns The parsed Exception, `null` if parsed Response has no Exception compatibile data.
 */
export const getErrorFromResponse = async ( options: GetErrorFromResponseOptions ) => {

	const { response }		= options
	const { responseType }	= options

	switch ( responseType ) {
		case 'document':
			break
		case 'json': {
			const _response = response as object
			if ( _response && Exception.isException( _response ) ) {
				return new Exception( _response.message, { ..._response } )
			}
			break
		}
		case '':
		case 'text':
		case 'arraybuffer':
		case 'blob':
		default: {

			const responseText	= (
				responseType === 'arraybuffer'
					? binaryToString( response as ArrayBuffer )
					: (
						responseType === 'blob'
							? await ( response as Blob ).text()
							: response
					)
			)

			if ( isJson( responseText ) ) {
				const error = JSON.parse( responseText )
				if ( Exception.isException( error ) ) {
					return new Exception( error.message, { ...error } )
				}
			}
			
			break
		}
	}

	return null

}