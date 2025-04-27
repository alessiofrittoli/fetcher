import { Url } from '@alessiofrittoli/url-utils'
import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { Exception } from '@alessiofrittoli/exception'
import { ErrorCode } from '@/error'
import type { XHR } from '@/types'


/**
 * Easly handle XML HTTP Requests.
 * 
 */
export class Xhr<TReturn = unknown> extends EventEmitter<XHR.Event.Map<TReturn>> implements XHR.Options
{
	/** The XMLHttpRequest instance.  */
	request: XMLHttpRequest
	url
	method
	body
	headers
	credentials
	response?: TReturn
	debug

	/** Indicates whether to automatically set the XHR response type based on the Response Content-Type Header. */
	private setResponseType = false

	private static NotAvailableErr = (
		new Exception( 'XMLHttpRequest not available', {
			code: ErrorCode.Request.XHR_NOT_AVAILABLE,
		} )
	)


	/** XHR progress events. */
	static readonly ProgressEvents: XHR.ProgressEventType[] = [
		'abort', 'timeout', 'error',
		'loadstart', 'progress',
		'load', 'loadend'
	]


	/**
	 * Construct a new instance of Xhr.
	 * 
	 * @param options Required options for a proper initialization.
	 */
	constructor( options: XHR.Options )
	{
		super( { captureRejections: true } )

		this.request = (
			typeof XMLHttpRequest !== 'undefined' // ensures no "Server Error"
				? new XMLHttpRequest()
				: ( null as unknown as XMLHttpRequest )
		)
		this.setResponseType = options.autoResponseType ?? true

		if ( this.request ) {
			if ( typeof options.responseType !== 'undefined' ) {
				this.setResponseType = false
				this.request.responseType = options.responseType
			}
			if ( typeof options.withCredentials !== 'undefined' ) {
				this.request.withCredentials = options.withCredentials
			}
			if ( options.requestTimeout ) {
				this.request.timeout = options.requestTimeout
			}
		}

		this.url			= options.url
		this.method			= options.method || 'GET'
		this.body			= options.body
		this.headers		= new Headers( options.headers )
		this.credentials	= options.credentials
		this.debug			= options.debug || false

		if ( options.signal ) {
			const abortListener = () => {
				this.abort()
				options.signal?.removeEventListener( 'abort', abortListener )
			}
			options.signal.addEventListener( 'abort', abortListener )
		}
	}


	/**
	 * Initialise XMLHttpRequest.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	init()
	{

		if ( ! this.request ) {
			return this.error( Xhr.NotAvailableErr )
		}

		this.emit( 'init', this )
		this.addListeners()
		this.request.open(
			this.method,
			Url.format( this.url ),
			true,
			this.credentials?.username,
			this.credentials?.password
		)
		this.setHeaders()

		this.request.removeEventListener( 'readystatechange', this.readyStateChangeHandler )
		this.request.addEventListener( 'readystatechange', this.readyStateChangeHandler )
		this.once( 'loadend', this.loadEndHandler )

		return this
	}


	/**
	 * Send XMLHttpRequest.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	async send()
	{
		if ( ! this.request ) {
			return this.error( Xhr.NotAvailableErr )
		}

		try {
			await this.request.send( this.body )
			this.emit( 'send', this )
			return this
		} catch ( err ) {
			const error = err as Error
			return this.error( new Exception( error.message, {
				code	: ErrorCode.Exception.UNKNOWN,
				cause	: error,
			} ) )
		}
    }


	/**
	 * Cancels any network activity.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	abort()
	{
		if ( ! this.request ) {
			return this.error( Xhr.NotAvailableErr )
		}
		
		this.request.abort()
		this.log( { message: 'The user aborted the request' } )
		return this
	}


	/**
	 * Handle `readystatechange` events.
	 * 
	 * @param event The Event interface.
	 */
	private readyStateChangeHandler = async ( event: Event ) => {
		if ( this.setResponseType ) {
			this.setResponseTypeFromResponseHeaders()
		}
		
		if ( this.debug ) {
			const { logReadyStateChange } = await import( './logReadyStateChange' )
			logReadyStateChange( this )
		}

		this.response = this.getResponse()
		this.emit( 'readystatechange', event, this )
	}


	/**
	 * Handle and emit progress events.
	 * 
	 * See {@link Xhr.ProgressEvents} for a list of listened events.
	 * 
	 * @param event The ProgressEvent interface.
	 */
	private progressEventHandler = ( event: ProgressEvent<XMLHttpRequestEventTarget> ) => {

		const eventType = event.type
		this.log( { event: eventType, message: `${ event.loaded } bytes transferred.` } )

		if ( eventType === 'error' ) {
			return this.error(
				new Exception( 'ProgressEvent Error', {
					code	: ErrorCode.Exception.UNKNOWN,
					cause	: event,
				} )
			)
		}
		
		this.emit( eventType, event, this )

		return this

	}


	/**
	 * Emit success or error events based on the received Response on Request Load End.
	 * 
	 */
	private loadEndHandler = async () => {
		
		const { status } = this.request

		if ( status <= 0 ) {
			/**
			 * If user abort the request by calling `Xhr.abort()` the `loadEndHandler` still get called.
			 */
			return this
		}

		try {
			
			if ( status < 100 || status >= 400 ) {

				this.setResponseTypeFromResponseHeaders()
				
				if (
					this.contentTypeToResponseType() === 'json' &&
					Exception.isException( this.response )
				) {
					return this.error( new Exception( this.response.message, { ...this.response } ) )
				}

				const { response }		= this
				const { responseType }	= this.request

				const { getErrorFromResponse } = await import( './getErrorFromResponse' )
				const error = await getErrorFromResponse( { responseType, response } )
				
				if ( error ) return this.error( error )
				
				return this.error( new Exception( 'Error from the server.', {
					code	: ErrorCode.Exception.UNKNOWN,
					cause	: this.response,
				} ) )

			}

			return this.success()
			
		} catch ( err ) {

			const error = err as Error

			return this.error(
				new Exception( error.message, { code: ErrorCode.Exception.UNKNOWN, ...error } )
			)

		}
	}


	/**
	 * Add listeners to the XMLHttpRequest instance.
	 * 
	 * See {@link Xhr.ProgressEvents} for a list of listened events.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private addListeners()
	{
		if ( ! this.request ) {
			return this.error( Xhr.NotAvailableErr )
		}

		Xhr.ProgressEvents.map( event => {
			this.request.removeEventListener( event, this.progressEventHandler )
			this.request.addEventListener( event, this.progressEventHandler )
		} )

		return this
	}


	/**
	 * Set the request headers.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private setHeaders()
	{
		if ( ! this.request ) {
			return this.error( Xhr.NotAvailableErr )
		}

		Array.from( this.headers.entries() ).forEach( ( [ key, value ] ) => {
			this.request!.setRequestHeader( key, value )
		} )

		return this
	}


	/**
	 * Convert MIME `Content-Type` to `XMLHttpRequestResponseType`.
	 * 
	 * @param	contentType (Optional) The MIME `Content-Type`. Default: `Content-Type` Response Header.
	 * @returns	The `XMLHttpRequestResponseType` based on the given MIME `Content-Type`.
	 */
	private contentTypeToResponseType( contentType?: string | null ): XMLHttpRequestResponseType
	{
		if ( typeof contentType === 'undefined' ) {
			contentType = this.getResponseContentType()
		}
		if ( ! contentType ) return ''

		contentType = contentType.toLowerCase()

		if (
			contentType.includes( 'text/html' ) ||
			contentType.includes( 'application/xml' )
		) return 'document'
		if ( contentType.includes( 'application/json' ) ) return 'json'
		if ( contentType.includes( 'application/octet-stream' ) ) return 'arraybuffer'
		if (
			contentType.startsWith( 'image/' ) ||
			contentType.startsWith( 'video/' )
		) return 'blob'
		
		return 'text'
	}


	/**
	 * Automatically set `XMLHttpRequestResponseType` based on the received Response `Content-Type` Header.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private setResponseTypeFromResponseHeaders()
	{
		if (
			this.request.readyState === XMLHttpRequest.LOADING ||
			this.request.readyState === XMLHttpRequest.DONE
		) return this

		const contentType = this.getResponseContentType()
		this.request.responseType = this.contentTypeToResponseType( contentType )
		this.log( {
			message			: 'Set XMLHttpRequest.responseType from Content-Type Response Headers.',
			contentType		: contentType,
			XhrResponseType	: this.request.responseType,
		} )

		return this
	}


	/**
	 * Get formatted response.
	 *
	 * @returns The response text or an object from a json response.
	 */
	getResponse(): TReturn | undefined
	{
		if ( ! this.request ) {
			this.error( Xhr.NotAvailableErr )
			return
		}
		
		this.response = this.request.response
		return this.response as TReturn
	}


	/**
	 * Get `Content-Type` Response Header.
	 * 
	 * @returns The Response Header value, `null` if none has been found.
	 */
	getResponseContentType()
	{
		return this.getResponseHeader( 'Content-Type' )
	}


	/**
	 * Get Response Header.
	 * 
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/getResponseHeader)
	 * 
	 * @param	name The Header name.
	 * @returns	The Response Header value, `null` if none has been found.
	 */
	getResponseHeader( name: string )
	{
		return this.request.getResponseHeader( name )
	}


	/**
	 * On success functions.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private success()
	{
		this.emit( 'success', this.response!, this )
		return this
	}


	/**
	 * On error functions.
	 * 
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private error( exception: Exception<string, ErrorCode> )
	{
		this.emit( 'error', exception, this )
		return this
	}


	/**
	 * Prints to `stdout` with newline.
	 * 
	 * @param	data The data print out.
	 * @returns	The current `Xhr` instance for chaining purposes.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	log( data: Record<'message', string> & Record<string, any> )
	{
		if ( ! this.debug ) return this
		console.log( { class: 'Xhr', ...data } )
		return this
	}
}