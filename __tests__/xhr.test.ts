/**
 * @jest-environment jest-environment-jsdom
 */

import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { AbortController } from '@alessiofrittoli/abort-controller'

import { ErrorCode } from '@/error'
import { Xhr } from '@/xhr'
import type { XHR } from '@/types'
import { AbortError } from '@alessiofrittoli/exception/abort'
import { Exception } from '@alessiofrittoli/exception'

const url = 'http://127.0.0.1:3000'

type MockedXMLHttpRequest = (
	Omit<jest.Mocked<XMLHttpRequest>, 'readyState' | 'responseURL'>
	& {
		readyState	: number
		responseURL	: string
	}
)

describe( 'Xhr - client', () => {

	let xhr: Xhr
	let mockXMLHttpRequest: MockedXMLHttpRequest
	let emitter: EventEmitter

	beforeEach( () => {

		// mock console.log implementation to avoid un-necessary `debug` logs
		jest.spyOn( console, 'log' ).mockImplementation( () => {} )

		emitter = new EventEmitter()

		mockXMLHttpRequest = ( {
			method		: 'GET',
			readyState	: 0,
			responseURL	: '',
			abort: jest.fn( () => {
				mockXMLHttpRequest.dispatchEvent( new ProgressEvent( 'abort' ) )
			} ),
			addEventListener: jest.fn( ( ...args: [ event: string, fn: () => void ] ) => {
				emitter.on( ...args )
			} ),
			removeEventListener: jest.fn( ( ...args: [ event: string, fn: () => void ] ) => {
				emitter.off( ...args )
			} ),
			dispatchEvent: jest.fn( ( event: Event | ProgressEvent<XMLHttpRequestEventTarget> ) => {
				emitter.emit( event.type, event )
			} ),
			error: jest.fn(),
			getResponseHeader: jest.fn(),
			getAllResponseHeaders: jest.fn(),
			onreadystatechange: jest.fn(),
			open: jest.fn( ( ...args: Parameters<XMLHttpRequest[ 'open' ]> ) => {
				
				const [
					, url, , username, password
				] = args // [ method, url, async, username, password ]

				const responseUrl = new URL( url )

				if ( username ) {
					responseUrl.username = username
				}
				if ( password ) {
					responseUrl.password = password
				}

				mockXMLHttpRequest.responseURL	= responseUrl.toString()
				mockXMLHttpRequest.readyState	= XMLHttpRequest.OPENED
			} ),
			progress: jest.fn(),
			response: jest.fn(),
			responseText: jest.fn(),
			responseType: jest.fn(),
			responseXML: jest.fn(),
			send: jest.fn( async () => {

				if ( mockXMLHttpRequest.readyState !== XMLHttpRequest.OPENED ) {
					mockXMLHttpRequest.readyState = XMLHttpRequest.UNSENT
					throw new DOMException( 'Failed to execute \'send\' on \'XMLHttpRequest\': The object\'s state must be OPENED.', 'InvalidStateError' )	
				}

				mockXMLHttpRequest.readyState = XMLHttpRequest.HEADERS_RECEIVED
				mockXMLHttpRequest.dispatchEvent( new Event( 'readystatechange' ) )
				mockXMLHttpRequest.readyState = XMLHttpRequest.LOADING
				mockXMLHttpRequest.dispatchEvent( new Event( 'readystatechange' ) )
				mockXMLHttpRequest.readyState = XMLHttpRequest.DONE
				mockXMLHttpRequest.dispatchEvent( new Event( 'readystatechange' ) )

				mockXMLHttpRequest.readyState = XMLHttpRequest.UNSENT

			} ),
			setRequestHeader: jest.fn(),
			status: 200,
			statusText: jest.fn(),
			timeout: jest.fn(),
			upload: jest.fn(),
			withCredentials: jest.fn(),
		} ) as unknown as MockedXMLHttpRequest

		const MockedXMLHttpRequest = (
			jest.fn( () => mockXMLHttpRequest )
		) as unknown as typeof XMLHttpRequest

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;( MockedXMLHttpRequest.UNSENT as any ) = 0
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;( MockedXMLHttpRequest.OPENED as any ) = 1
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;( MockedXMLHttpRequest.HEADERS_RECEIVED as any ) = 2
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;( MockedXMLHttpRequest.LOADING as any ) = 3
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;( MockedXMLHttpRequest.DONE as any ) = 4

		global.XMLHttpRequest = MockedXMLHttpRequest

		xhr = new Xhr( { url } )
	} )


	afterEach( () => {
		xhr.removeAllListeners()
		emitter.removeAllListeners()
		jest.restoreAllMocks().resetModules()
	} )


	it( 'initialises with the bare minimum options', () => {

		const xhr = new Xhr( { url } )

		expect( xhr.url ).toBe( url )
		expect( xhr.method ).toBe( 'GET' )
		expect( xhr.body ).toBe( undefined )
		expect( xhr.headers ).toBeInstanceOf( Headers )
		expect( Array.from( xhr.headers.keys() ).length ).toBe( 0 )
		expect( xhr[ 'setResponseType' ] ).toBe( true )
		expect( xhr.debug ).toBe( false )

	} )
	
	
	it( 'sets custom options', () => {

		const xhr = new Xhr( {
			url,
			method			: 'POST',
			body			: JSON.stringify( { key: 'value' } ),
			credentials		: { username: 'username', password: 'password' },
			debug			: true,
			headers			: new Headers( { 'Content-Type': 'application/json' } ),
			autoResponseType: true, // this will be ignored since we're setting `responseType`
			responseType	: 'json',
			withCredentials	: true,
			timeout			: 5000,
		} )

		expect( xhr.url ).toBe( url )
		expect( xhr.method ).toBe( 'POST' )
		expect( xhr.body ).toBe( JSON.stringify( { key: 'value' } ) )
		expect( xhr.credentials ).toEqual( { username: 'username', password: 'password' } )
		expect( xhr.debug ).toBe( true )
		expect( xhr.headers.get( 'Content-Type' ) ).toBe( 'application/json' )

		expect( xhr[ 'setResponseType' ] ).toBe( false )
		expect( xhr.request.responseType ).toBe( 'json' )
		expect( xhr.request.withCredentials ).toBe( true )
		expect( xhr.request.responseType ).toBe( 'json' )
		expect( xhr.request.timeout ).toBe( 5000 )

	} )


	describe( 'Xhr.init()', () => {


		it( 'overrides its internal AbortController reference if a new AbortController is given', () => {

			const previusController = xhr.controller

			const newController = new AbortController()

			xhr.init( { controller: newController } )

			expect( xhr.controller ).not.toBe( previusController )
			expect( xhr.controller ).toBe( newController )

		} )
		
		
		it( 'creates a new AbortController instance if previous signal has been aborted', () => {

			const xhr = new Xhr( { url } )
			const previusController = xhr.controller
			
			xhr.abort().init()

			expect( xhr.controller ).not.toBe( previusController )

		} )


		it( 'emits an init event before any other action is performed', async () => {

			const onInit: XHR.Event.Listener<'init'> = jest.fn()

			xhr.once( 'init', onInit ).init()

			expect( onInit ).toHaveBeenCalledWith( xhr )

		} )


		it( 'removes previous and adds new progress event listeners', () => {

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const addProgressListeners	= jest.spyOn( xhr as any, 'addProgressListeners' )
			const removeEventListener	= jest.spyOn( xhr.request, 'removeEventListener' )
			const addEventListener		= jest.spyOn( xhr.request, 'addEventListener' )

			xhr.init()

			expect( addProgressListeners ).toHaveBeenCalled()

			Xhr.ProgressEvents.map( event => {
				expect( removeEventListener ).toHaveBeenCalledWith( event, xhr[ 'progressEventHandler' ] )
				expect( addEventListener ).toHaveBeenCalledWith( event, xhr[ 'progressEventHandler' ] )
			} )

		} )


		it( 'opens the request with XMLHttpRequest.open()', () => {

			const requestOpen = jest.spyOn( xhr.request, 'open' )

			xhr.init()

			expect( requestOpen ).toHaveBeenCalledWith(
				'GET', url, true, undefined, undefined
			)
			expect( xhr.request.readyState ).toBe( XMLHttpRequest.OPENED )

		} )


		it( 'sets custom Request headers', () => {

			const xhr = new Xhr( {
				url		: url,
				headers	: new Headers( { 'Authorization': 'Bearer token' } ),
			} )

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const setHeaders		= jest.spyOn( xhr as any, 'setHeaders' )
			const setRequestHeader	= jest.spyOn( xhr.request, 'setRequestHeader' )

			xhr.init()

			expect( setHeaders ).toHaveBeenCalled()
			expect( setRequestHeader )
				.toHaveBeenCalledWith( 'authorization', 'Bearer token' )
			
		} )


		it( 'removes previous and adds new readystatechange listeners', () => {

			const removeEventListener	= jest.spyOn( xhr.request, 'removeEventListener' )
			const addEventListener		= jest.spyOn( xhr.request, 'addEventListener' )


			xhr.init()
			
			expect( removeEventListener )
				.toHaveBeenCalledWith( 'readystatechange', xhr[ 'readyStateChangeHandler' ] )
			expect( addEventListener )
				.toHaveBeenCalledWith( 'readystatechange', xhr[ 'readyStateChangeHandler' ] )
			
		} )


		it( 'listen for loadend once', () => {
			
			const onceSpy = jest.spyOn( xhr, 'once' )
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const loadEndSpy = jest.spyOn( xhr as any, 'loadEndHandler' )
			
			xhr.init()

			const event = new ProgressEvent( 'loadend' )
			xhr.request.dispatchEvent( event )
			xhr.request.dispatchEvent( event )

			expect( onceSpy )
				.toHaveBeenCalledWith( 'loadend', xhr[ 'loadEndHandler' ] )

			expect( loadEndSpy )
				.toHaveBeenCalledWith( event, xhr )
			expect( loadEndSpy )
				.toHaveBeenCalledTimes( 1 )
			
		} )


		it( 'listen for AbortSignal abort event', () => {

			const addEventListener = jest.spyOn( xhr.controller.signal, 'addEventListener' )

			xhr.init()

			expect( addEventListener )
				.toHaveBeenCalledWith( 'abort', xhr[ 'controllerAbortListener' ] )
			
		} )


	} )


	describe( 'Xhr.send()', () => {

		it( 'emits send event before actually sending the request', async () => {

			const onSend: XHR.Event.Listener<'send'> = jest.fn( async () => {
				expect( xhr.request.readyState ).toBe( XMLHttpRequest.OPENED )
			} )

			await xhr.once( 'send', onSend ).init().send()
			
			expect( onSend ).toHaveBeenCalledWith( xhr )

		} )


		it( 'emits an error event if XMLHttpRequest readyState is not open', async () => {

			const onError: XHR.Event.Listener<'error'> = jest.fn( ( error, xhr ) => {
				
				expect( xhr.request.readyState ).toBe( XMLHttpRequest.UNSENT )
				expect( error.code ).toBe( ErrorCode.Request.XHR_INVALID_STATE )

			} )
	
			await xhr.once( 'error', onError ).send()
			
			expect( onError ).toHaveBeenCalled()

		} )
		
		
		it( 'emits an error event if calling send multiple times without re-init', async () => {
			
			const onError: XHR.Event.Listener<'error'> = jest.fn( ( error, xhr ) => {
				
				expect( xhr.request.readyState ).toBe( XMLHttpRequest.UNSENT )
				expect( error.code ).toBe( ErrorCode.Request.XHR_INVALID_STATE )

			} )
	
			xhr.once( 'error', onError ).init()
			
			await xhr.send()
			await xhr.send()
			
			expect( onError ).toHaveBeenCalled()

		} )


		it( 'emits an error event with UNKNOWN as error code if caught error is not an `InvalidStateError`', async () => {

			mockXMLHttpRequest.send.mockImplementationOnce( () => {
				throw new Error( 'Unknown error' )
			} )


			const onError: XHR.Event.Listener<'error'> = jest.fn( ( error, _xhr ) => {
				
				expect( error.code ).toBe( ErrorCode.Exception.UNKNOWN )
				expect( _xhr ).toBe( xhr )

			} )

			xhr.once( 'error', onError ).init()

			await xhr.send()
			
			expect( onError ).toHaveBeenCalled()


		} )

	} )


	describe( 'Xhr.abort()', () => {

		it( 'cancels any network activity', () => {

			const abort = jest.spyOn( xhr.request, 'abort' )
			const onSuccess: XHR.Event.Listener<'success'> = jest.fn()

			xhr.once( 'success', onSuccess ).init().send()
				.then( () => {
					expect( onSuccess ).not.toHaveBeenCalled()
				} )
			xhr.abort()

			expect( abort ).toHaveBeenCalled()
			
		} )


		it( 'dispatches abort event on abort controller and emits an abort event', () => {

			const controller		= new AbortController()
			const controllerAbortSpy= jest.spyOn( controller, 'abort' )
			const requestAbortSpy	= jest.spyOn( xhr.request, 'abort' )
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const abortListenerSpy = jest.spyOn( xhr as any, 'controllerAbortListener' )
			
			const onAbort: XHR.Event.Listener<'abort'> = jest.fn( ( reason, event, _xhr ) => {
				expect( reason.message ).toBe( 'Custom abort reason' )
				expect( reason.code ).toBe( ErrorCode.Exception.ABORT )
				expect( event ).toBeInstanceOf( ProgressEvent )
				expect( _xhr ).toBe( xhr )
			} )

			xhr.once( 'abort', onAbort ).init( { controller } ).send()
			xhr.abort( 'Custom abort reason' )
			
			expect( controllerAbortSpy ).toHaveBeenCalled()
			expect( abortListenerSpy ).toHaveBeenCalled()
			expect( requestAbortSpy ).toHaveBeenCalled()
			expect( onAbort ).toHaveBeenCalled()

		} )


		it( 'does nothing if aborting multiple times without re-init', () => {

			const controller		= new AbortController()
			const controllerAbortSpy= jest.spyOn( controller, 'abort' )
			const requestAbortSpy	= jest.spyOn( xhr.request, 'abort' )
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const abortListenerSpy = jest.spyOn( xhr as any, 'controllerAbortListener' )
			
			const onAbort: XHR.Event.Listener<'abort'> = jest.fn()

			xhr.once( 'abort', onAbort ).init( { controller } ).send()
			xhr.abort( 'Custom abort reason' )
			xhr.abort( 'Abort again' )
			
			expect( controllerAbortSpy ).toHaveBeenCalledTimes( 2 )
			expect( abortListenerSpy ).toHaveBeenCalledTimes( 1 )
			expect( requestAbortSpy ).toHaveBeenCalledTimes( 1 )
			expect( onAbort ).toHaveBeenCalledTimes( 1 )

		} )

	} )


	describe( 'Xhr.readyStateChangeHandler()', () => {

		it( 'sets responseType from Response Headers if autoResponseType is set to true', async () => {

			const setResponseTypeFromResponseHeaders = (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				jest.spyOn( xhr as any, 'setResponseTypeFromResponseHeaders' )
			)

			xhr.init()

			mockXMLHttpRequest.getResponseHeader
				.mockImplementationOnce( () => 'application/json' )
			
			await xhr.send()

			expect( setResponseTypeFromResponseHeaders )
				.toHaveBeenCalled()
			
			expect( xhr.request.responseType )
				.toBe( 'json' )

		} )


		it( 'logs readystatechange event if debug is set to true', async () => {

			const log = jest.spyOn( console, 'log' ).mockImplementationOnce( () => {} )
			const xhr = new Xhr( {
				url,
				debug: true,
				// set `responseType` so `setResponseTypeFromResponseHeaders` doesn't get called since it logs data
				responseType: 'json',
			} )

			/**
			 * event dispatch required since Xhr.readyStateChangeHandler() is an async function
			 * which dynamically imports `logReadyStateChange` to log data.
			 */


			mockXMLHttpRequest.readyState = XMLHttpRequest.UNSENT
			await xhr[ 'readyStateChangeHandler' ]( new Event( 'readystatechange' ) )

			mockXMLHttpRequest.readyState = XMLHttpRequest.OPENED
			await xhr[ 'readyStateChangeHandler' ]( new Event( 'readystatechange' ) )

			mockXMLHttpRequest.readyState = XMLHttpRequest.HEADERS_RECEIVED
			await xhr[ 'readyStateChangeHandler' ]( new Event( 'readystatechange' ) )

			mockXMLHttpRequest.readyState = XMLHttpRequest.LOADING
			await xhr[ 'readyStateChangeHandler' ]( new Event( 'readystatechange' ) )

			mockXMLHttpRequest.readyState = XMLHttpRequest.DONE
			await xhr[ 'readyStateChangeHandler' ]( new Event( 'readystatechange' ) )


			expect( log ).toHaveBeenNthCalledWith( 1, {
				class		: 'Xhr',
				event		: 'readystatechange',
				message		: 'Request unsent',
				readyState	: XMLHttpRequest.UNSENT,
				status		: xhr.request.status,
			} )
			expect( log ).toHaveBeenNthCalledWith( 2, {
				class		: 'Xhr',
				event		: 'readystatechange',
				message		: 'Request opened',
				readyState	: XMLHttpRequest.OPENED,
				status		: xhr.request.status,
			} )
			expect( log ).toHaveBeenNthCalledWith( 3, {
				class		: 'Xhr',
				event		: 'readystatechange',
				message		: 'Request headers received',
				readyState	: XMLHttpRequest.HEADERS_RECEIVED,
				status		: xhr.request.status,
			} )
			expect( log ).toHaveBeenNthCalledWith( 4, {
				class		: 'Xhr',
				event		: 'readystatechange',
				message		: 'Request loading',
				readyState	: XMLHttpRequest.LOADING,
				status		: xhr.request.status,
			} )
			expect( log ).toHaveBeenNthCalledWith( 5, {
				class		: 'Xhr',
				event		: 'readystatechange',
				message		: 'Request done',
				readyState	: XMLHttpRequest.DONE,
				status		: xhr.request.status,
			} )

		} )


		it( 'gets the response', async () => {

			const getResponse = jest.spyOn( xhr, 'getResponse' )

			expect( xhr.response ).toBeUndefined()
			await xhr.init().send()
			
			expect( getResponse ).toHaveBeenCalled()

			/** FIXME: should we mock the response based on the responseUrl? */
			expect( xhr.response ).toBe( mockXMLHttpRequest.response )

		} )

	} )


	describe( 'Xhr.progressEventHandler()', () => {

		// "abort": ProgressEvent<XMLHttpRequestEventTarget>;
		// "error": ProgressEvent<XMLHttpRequestEventTarget>;
		// "load": ProgressEvent<XMLHttpRequestEventTarget>;
		// "loadend": ProgressEvent<XMLHttpRequestEventTarget>;
		// "loadstart": ProgressEvent<XMLHttpRequestEventTarget>;
		// "progress": ProgressEvent<XMLHttpRequestEventTarget>;
		// "timeout": ProgressEvent<XMLHttpRequestEventTarget>;	

		it( 'emits an event relative to the progress event type', () => {

			Xhr.ProgressEvents
				.filter( type => type !== 'abort' )
				.map( type => {

					const onEvent = jest.fn()

					xhr.on( type, onEvent )

					const event = new ProgressEvent( type, {
						loaded	: 100,
						total	: 200,
					} ) as ProgressEvent<XMLHttpRequestEventTarget>
		
					xhr[ 'progressEventHandler' ]( event )

					if ( type === 'error' ) {
						expect( onEvent )
							.toHaveBeenCalledWith(
								expect.objectContaining(
									new Exception( 'ProgressEvent Error', {
										code	: ErrorCode.Exception.UNKNOWN,
										cause	: event,
									} )
								), xhr
							)
						return
					}

					expect( onEvent )
						.toHaveBeenCalledWith( event, xhr )

				} )
			

			const onAbort: XHR.Event.Listener<'abort'> = jest.fn()

			xhr.on( 'abort', onAbort ).init().abort( 'Abort reason' )

			expect( onAbort )
				.toHaveBeenCalledWith(
					expect.objectContaining( new AbortError( 'Abort reason' ) ),
					expect.objectContaining( new ProgressEvent( 'abort' ) ),
					xhr
				)

		} )


		it( 'logs progress event data', () => {

			const log = jest.spyOn( xhr, 'log' )

			const event = new ProgressEvent( 'load', {
				loaded: 100,
			} ) as ProgressEvent<XMLHttpRequestEventTarget>

			xhr[ 'progressEventHandler' ]( event )

			expect( log )
				.toHaveBeenCalledWith( {
					event	: event.type,
					message	: `${ event.loaded } bytes transferred.`,
				} )

		} )

	} )


	describe( 'Xhr.log()', () => {

		it( 'logs messages when debug is enabled', () => {

			const logSpy= jest.spyOn( console, 'log' )
			xhr.debug	= true
			
			xhr.log( { message: 'Test log' } )
	
			expect( logSpy ).toHaveBeenCalledWith( { class: 'Xhr', message: 'Test log' } )

		} )


		it( 'doesn\'t log messages when debug is disabled', () => {

			const logSpy	= jest.spyOn( console, 'log' )
			xhr.debug		= false

			xhr.log( { message: 'Test log' } )
	
			expect( logSpy ).not.toHaveBeenCalled()

		} )

	} )
	
} )