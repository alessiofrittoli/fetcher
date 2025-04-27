import type { Xhr } from '.'

/**
 * Log `readystatechange` events.
 * 
 * @param xhr The Xhr instance.
 */
export const logReadyStateChange = ( xhr: Xhr ) => {

	const logData = {
		event		: 'readystatechange',
		readyState	: xhr.request.readyState,
		status		: xhr.request.status,
		message		: '',
	}

	switch ( xhr.request.readyState ) {
		case XMLHttpRequest.UNSENT:
			logData.message = 'Request unsent'
			break
		case XMLHttpRequest.OPENED:
			logData.message = 'Request opened'
			break
		case XMLHttpRequest.HEADERS_RECEIVED:
			logData.message = 'Request headers received'
			break
		case XMLHttpRequest.LOADING:
			logData.message = 'Request loading'
			break
		case XMLHttpRequest.DONE:
			logData.message = 'Request done'
			break
	}

	xhr.log( logData )
}