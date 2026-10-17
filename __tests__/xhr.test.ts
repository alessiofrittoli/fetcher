/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AbortController } from '@alessiofrittoli/abort-controller'
import { AbortError } from '@alessiofrittoli/exception/abort'
import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { Exception } from '@alessiofrittoli/exception'
import type { RequestMethod, XHR } from '@/types'
import { ErrorCode } from '@/error'
import { Xhr } from '@/xhr'

const url = 'http://127.0.0.1:3000'

// type MockXMLHttpRequest = {
// 	method: XHR.Method
// 	readyState: number
// 	responseURL: string
// 	status: number
// 	UNSENT: 0
// 	OPENED: 1
// 	HEADERS_RECEIVED: 2
// 	LOADING: 3
// 	DONE: 4
// 	send: Mock<() => Promise<void>>
// 	open: Mock<
// 		(
// 			method: XHR.Method,
// 			url: string | URL,
// 			async: boolean,
// 			username?: string | null | undefined,
// 			password?: string | null | undefined,
// 		) => void
// 	>
// 	addEventListener: Mock<(event: string, fn: () => void) => void>
// 	removeEventListener: Mock<(event: string, fn: () => void) => void>
// 	dispatchEvent: Mock<(event: Event | ProgressEvent<XMLHttpRequestEventTarget>) => void>
// 	abort: Mock<() => void>
// 	error: Mock<() => void>
// 	getResponseHeader: Mock<() => string | null>
// 	getAllResponseHeaders: Mock<() => void>
// 	onreadystatechange: Mock<() => void>
// 	progress: Mock<() => void>
// 	response: Mock<() => void>
// 	responseText: Mock<() => void>
// 	responseType: Mock<() => void>
// 	responseXML: Mock<() => void>
// 	setRequestHeader: Mock<() => Promise<void>>
// 	statusText: Mock<() => Promise<void>>
// 	timeout: Mock<() => Promise<void>>
// 	upload: Mock<() => Promise<void>>
// 	withCredentials: Mock<() => Promise<void>>
// }

class MockXMLHttpRequest extends EventEmitter {
	public method: RequestMethod
	public readyState: number
	public responseURL: string
	public status: number

	public static readonly UNSENT = 0
	public static readonly OPENED = 1
	public static readonly HEADERS_RECEIVED = 2
	public static readonly LOADING = 3
	public static readonly DONE = 4

	public constructor() {
		super()

		this.method = 'GET'
		this.readyState = 0
		this.responseURL = ''
		this.status = 200
	}

	public open = vi.fn((...args: Parameters<XMLHttpRequest['open']>) => {
		const [, url, , username, password] = args // [ method, url, async, username, password ]

		const responseUrl = new URL(url)

		if (username) {
			responseUrl.username = username
		}
		if (password) {
			responseUrl.password = password
		}

		this.responseURL = responseUrl.toString()
		this.readyState = MockXMLHttpRequest.OPENED
	})

	public send = vi.fn(async () => {
		if (this.readyState !== XMLHttpRequest.OPENED) {
			this.readyState = XMLHttpRequest.UNSENT
			throw new DOMException(
				"Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.",
				'InvalidStateError',
			)
		}

		// simulate server response timings
		await new Promise(resolve => setTimeout(resolve, 20))
		this.readyState = XMLHttpRequest.HEADERS_RECEIVED
		this.dispatchEvent(new Event('readystatechange'))

		// simulate server response timings
		await new Promise(resolve => setTimeout(resolve, 20))
		this.readyState = XMLHttpRequest.LOADING
		this.dispatchEvent(new Event('readystatechange'))

		// simulate server response timings
		await new Promise(resolve => setTimeout(resolve, 20))
		this.readyState = XMLHttpRequest.DONE
		this.dispatchEvent(new Event('readystatechange'))

		this.dispatchEvent(new ProgressEvent('loadend'))

		this.readyState = XMLHttpRequest.UNSENT
	})

	public abort = vi.fn(() => {
		this.status = 0
		this.readyState = XMLHttpRequest.DONE
		this.dispatchEvent(new ProgressEvent('abort'))
	})

	public addEventListener = vi.fn((...args: [event: string, fn: () => void]) => {
		this.on(...args)
	})

	public removeEventListener = vi.fn((...args: [event: string, fn: () => void]) => {
		this.off(...args)
	})

	public dispatchEvent = vi.fn((event: Event | ProgressEvent<XMLHttpRequestEventTarget>) => {
		this.emit(event.type, event)
	})

	public error = vi.fn()
	public getResponseHeader = vi.fn()
	public getAllResponseHeaders = vi.fn()
	public onreadystatechange = vi.fn()
	public progress = vi.fn()
	public response = vi.fn()
	public responseText = vi.fn()
	public responseType = vi.fn()
	public responseXML = vi.fn()
	public setRequestHeader = vi.fn()
	public statusText = vi.fn()
	public timeout = vi.fn()
	public upload = vi.fn()
	public withCredentials = vi.fn()
}

describe('Xhr - client', () => {
	let mockXMLHttpRequest: MockXMLHttpRequest
	let xhr: Xhr

	beforeEach(() => {
		// mock console.log implementation to avoid un-necessary `debug` logs
		vi.spyOn(console, 'log').mockImplementation(() => {})

		mockXMLHttpRequest = new MockXMLHttpRequest()

		vi.stubGlobal(
			'XMLHttpRequest',
			class {
				public static readonly UNSENT = 0
				public static readonly OPENED = 1
				public static readonly HEADERS_RECEIVED = 2
				public static readonly LOADING = 3
				public static readonly DONE = 4

				public constructor() {
					return mockXMLHttpRequest
				}
			},
		)

		xhr = new Xhr({ url })
	})

	afterEach(() => {
		xhr.removeAllListeners()
		mockXMLHttpRequest.removeAllListeners()
		vi.restoreAllMocks().resetModules()
	})

	it('initialises with the bare minimum options', () => {
		const xhr = new Xhr({ url })

		expect(xhr.url).toBe(url)
		expect(xhr.method).toBe('GET')
		expect(xhr.body).toBe(undefined)
		expect(xhr.headers).toBeInstanceOf(Headers)
		expect(Array.from(xhr.headers.keys()).length).toBe(0)
		expect(xhr['setResponseType']).toBe(true)
		expect(xhr.debug).toBe(false)
	})

	it('sets custom options', () => {
		const xhr = new Xhr({
			url,
			method: 'POST',
			body: JSON.stringify({ key: 'value' }),
			credentials: { username: 'username', password: 'password' },
			debug: true,
			headers: new Headers({ 'Content-Type': 'application/json' }),
			autoResponseType: true, // this will be ignored since we're setting `responseType`
			responseType: 'json',
			withCredentials: true,
			timeout: 5000,
		})

		expect(xhr.url).toBe(url)
		expect(xhr.method).toBe('POST')
		expect(xhr.body).toBe(JSON.stringify({ key: 'value' }))
		expect(xhr.credentials).toEqual({ username: 'username', password: 'password' })
		expect(xhr.debug).toBe(true)
		expect(xhr.headers.get('Content-Type')).toBe('application/json')

		expect(xhr['setResponseType']).toBe(false)
		expect(xhr.request.responseType).toBe('json')
		expect(xhr.request.withCredentials).toBe(true)
		expect(xhr.request.responseType).toBe('json')
		expect(xhr.request.timeout).toBe(5000)
	})

	describe('Xhr.init()', () => {
		it('overrides its internal AbortController reference if a new AbortController is given', () => {
			const previusController = xhr.controller

			const newController = new AbortController()

			xhr.init({ controller: newController })

			expect(xhr.controller).not.toBe(previusController)
			expect(xhr.controller).toBe(newController)
		})

		it('creates a new AbortController instance if previous signal has been aborted', () => {
			const xhr = new Xhr({ url })
			const previusController = xhr.controller

			xhr.abort().init()

			expect(xhr.controller).not.toBe(previusController)
		})

		it('emits an init event before any other action is performed', async () => {
			const onInit: XHR.Event.Listener<'init'> = vi.fn()

			xhr.once('init', onInit).init()

			expect(onInit).toHaveBeenCalledWith(xhr)
		})

		it('removes previous and adds new progress event listeners', () => {
			const addProgressListeners = vi.spyOn(xhr, 'addProgressListeners')
			const removeEventListener = vi.spyOn(xhr.request, 'removeEventListener')
			const addEventListener = vi.spyOn(xhr.request, 'addEventListener')

			xhr.init()

			expect(addProgressListeners).toHaveBeenCalled()

			Xhr.ProgressEvents.map(event => {
				expect(removeEventListener).toHaveBeenCalledWith(event, xhr['onProgressChange'])
				expect(addEventListener).toHaveBeenCalledWith(event, xhr['onProgressChange'])
			})
		})

		it('opens the request with XMLHttpRequest.open()', () => {
			const requestOpen = vi.spyOn(xhr.request, 'open')

			xhr.init()

			expect(requestOpen).toHaveBeenCalledWith('GET', url, true, undefined, undefined)
			expect(xhr.request.readyState).toBe(XMLHttpRequest.OPENED)
		})

		it('sets custom Request headers', () => {
			const xhr = new Xhr({
				url: url,
				headers: new Headers({ Authorization: 'Bearer token' }),
			})

			const setHeaders = vi.spyOn(xhr, 'setHeaders')
			const setRequestHeader = vi.spyOn(xhr.request, 'setRequestHeader')

			xhr.init()

			expect(setHeaders).toHaveBeenCalled()
			expect(setRequestHeader).toHaveBeenCalledWith('authorization', 'Bearer token')
		})

		it('removes previous and adds new readystatechange listeners', () => {
			const removeEventListener = vi.spyOn(xhr.request, 'removeEventListener')
			const addEventListener = vi.spyOn(xhr.request, 'addEventListener')

			xhr.init()

			expect(removeEventListener).toHaveBeenCalledWith('readystatechange', xhr['onReadyStateChange'])
			expect(addEventListener).toHaveBeenCalledWith('readystatechange', xhr['onReadyStateChange'])
		})

		it('listen for loadend once', () => {
			const onceSpy = vi.spyOn(xhr, 'once')

			const loadEndSpy = vi.spyOn(xhr, 'loadEndHandler')

			xhr.init()

			const event = new ProgressEvent('loadend')
			xhr.request.dispatchEvent(event)
			xhr.request.dispatchEvent(event)

			expect(onceSpy).toHaveBeenCalledWith('loadend', xhr['loadEndHandler'])

			expect(loadEndSpy).toHaveBeenCalledWith(event, xhr)
			expect(loadEndSpy).toHaveBeenCalledTimes(1)
		})

		it('listen for AbortSignal abort event', () => {
			const addEventListener = vi.spyOn(xhr.controller.signal, 'addEventListener')

			xhr.init()

			expect(addEventListener).toHaveBeenCalledWith('abort', xhr['onControllerSignalAbort'])
		})
	})

	describe('Xhr.send()', () => {
		it('emits send event before actually sending the request', async () => {
			const onSend: XHR.Event.Listener<'send'> = vi.fn(async () => {
				expect(xhr.request.readyState).toBe(XMLHttpRequest.OPENED)
			})

			await xhr.once('send', onSend).init().send()

			expect(onSend).toHaveBeenCalledWith(xhr)
		})

		it('emits an error event if XMLHttpRequest readyState is not open', async () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn((error, xhr) => {
				expect(xhr.request.readyState).toBe(XMLHttpRequest.UNSENT)
				expect(error.code).toBe(ErrorCode.XHR_INVALID_STATE)
			})

			await xhr.once('error', onError).send()

			expect(onError).toHaveBeenCalled()
		})

		it('emits an error event if calling send multiple times without re-init', async () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn((error, xhr) => {
				expect(xhr.request.readyState).toBe(XMLHttpRequest.UNSENT)
				expect(error.code).toBe(ErrorCode.XHR_INVALID_STATE)
			})

			xhr.once('error', onError).init()

			await xhr.send()
			await xhr.send()

			expect(onError).toHaveBeenCalled()
		})

		it('emits an error event with UNKNOWN as error code if caught error is not an `InvalidStateError`', async () => {
			mockXMLHttpRequest.send.mockImplementationOnce(() => {
				throw new Error('Unknown error')
			})

			const onError: XHR.Event.Listener<'error'> = vi.fn((error, _xhr) => {
				expect(error.code).toBe(ErrorCode.UNKNOWN)
				expect(_xhr).toBe(xhr)
			})

			xhr.once('error', onError).init()

			await xhr.send()

			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.abort()', () => {
		it('cancels any network activity', () => {
			const abort = vi.spyOn(xhr.request, 'abort')
			const onSuccess: XHR.Event.Listener<'success'> = vi.fn()

			xhr.once('success', onSuccess)
				.init()
				.send()
				.then(() => {
					expect(onSuccess).not.toHaveBeenCalled()
				})
			xhr.abort()

			expect(abort).toHaveBeenCalled()
		})

		it('dispatches abort event on abort controller and emits an abort event', () => {
			const controller = new AbortController()
			const controllerAbortSpy = vi.spyOn(controller, 'abort')
			const requestAbortSpy = vi.spyOn(xhr.request, 'abort')

			const abortListenerSpy = vi.spyOn(xhr, 'onControllerSignalAbort')

			const onAbort: XHR.Event.Listener<'abort'> = vi.fn((reason, event, _xhr) => {
				expect(reason.message).toBe('Custom abort reason')
				expect(reason.code).toBe(ErrorCode.ABORT)
				expect(event).toBeInstanceOf(ProgressEvent)
				expect(_xhr).toBe(xhr)
			})

			xhr.once('abort', onAbort).init({ controller }).send()
			xhr.abort('Custom abort reason')

			expect(controllerAbortSpy).toHaveBeenCalled()
			expect(abortListenerSpy).toHaveBeenCalled()
			expect(requestAbortSpy).toHaveBeenCalled()
			expect(onAbort).toHaveBeenCalled()
		})

		it('does nothing if aborting multiple times without re-init', () => {
			const controller = new AbortController()
			const controllerAbortSpy = vi.spyOn(controller, 'abort')
			const requestAbortSpy = vi.spyOn(xhr.request, 'abort')

			const abortListenerSpy = vi.spyOn(xhr, 'onControllerSignalAbort')

			const onAbort: XHR.Event.Listener<'abort'> = vi.fn()

			xhr.once('abort', onAbort).init({ controller }).send()
			xhr.abort('Custom abort reason')
			xhr.abort('Abort again')

			expect(controllerAbortSpy).toHaveBeenCalledTimes(2)
			expect(abortListenerSpy).toHaveBeenCalledTimes(1)
			expect(requestAbortSpy).toHaveBeenCalledTimes(1)
			expect(onAbort).toHaveBeenCalledTimes(1)
		})
	})

	describe('Xhr.readyStateChangeHandler()', () => {
		it('sets responseType from Response Headers if autoResponseType is set to true', async () => {
			const setResponseTypeFromResponseHeaders = vi.spyOn(xhr, 'setResponseTypeFromResponseHeaders')

			xhr.init()

			mockXMLHttpRequest.getResponseHeader.mockReturnValueOnce('application/json')

			await xhr.send()

			expect(setResponseTypeFromResponseHeaders).toHaveBeenCalled()

			expect(xhr.request.responseType).toBe('json')
		})

		it('logs readystatechange event if debug is set to true', async () => {
			const log = vi.spyOn(console, 'log').mockImplementationOnce(() => {})
			const xhr = new Xhr({
				url,
				debug: true,
				// set `responseType` so `setResponseTypeFromResponseHeaders` doesn't get called since it logs data
				responseType: 'json',
			})

			/**
			 * event dispatch required since Xhr.readyStateChangeHandler() is an async function
			 * which dynamically imports `logReadyStateChange` to log data.
			 */

			mockXMLHttpRequest.readyState = XMLHttpRequest.UNSENT
			await xhr['onReadyStateChange'](new Event('readystatechange'))

			mockXMLHttpRequest.readyState = XMLHttpRequest.OPENED
			await xhr['onReadyStateChange'](new Event('readystatechange'))

			mockXMLHttpRequest.readyState = XMLHttpRequest.HEADERS_RECEIVED
			await xhr['onReadyStateChange'](new Event('readystatechange'))

			mockXMLHttpRequest.readyState = XMLHttpRequest.LOADING
			await xhr['onReadyStateChange'](new Event('readystatechange'))

			mockXMLHttpRequest.readyState = XMLHttpRequest.DONE
			await xhr['onReadyStateChange'](new Event('readystatechange'))

			expect(log).toHaveBeenNthCalledWith(1, {
				class: 'Xhr',
				event: 'readystatechange',
				message: 'Request unsent',
				readyState: XMLHttpRequest.UNSENT,
				status: xhr.request.status,
			})
			expect(log).toHaveBeenNthCalledWith(2, {
				class: 'Xhr',
				event: 'readystatechange',
				message: 'Request opened',
				readyState: XMLHttpRequest.OPENED,
				status: xhr.request.status,
			})
			expect(log).toHaveBeenNthCalledWith(3, {
				class: 'Xhr',
				event: 'readystatechange',
				message: 'Request headers received',
				readyState: XMLHttpRequest.HEADERS_RECEIVED,
				status: xhr.request.status,
			})
			expect(log).toHaveBeenNthCalledWith(4, {
				class: 'Xhr',
				event: 'readystatechange',
				message: 'Request loading',
				readyState: XMLHttpRequest.LOADING,
				status: xhr.request.status,
			})
			expect(log).toHaveBeenNthCalledWith(5, {
				class: 'Xhr',
				event: 'readystatechange',
				message: 'Request done',
				readyState: XMLHttpRequest.DONE,
				status: xhr.request.status,
			})
		})

		it('gets the response', async () => {
			const getResponse = vi.spyOn(xhr, 'getResponse')

			expect(xhr.response).toBeUndefined()
			await xhr.init().send()

			expect(getResponse).toHaveBeenCalled()

			/** FIXME: should we mock the response based on the responseUrl? */
			expect(xhr.response).toBe(mockXMLHttpRequest.response)
		})
	})

	describe('Xhr.progressEventHandler()', () => {
		// "abort": ProgressEvent<XMLHttpRequestEventTarget>;
		// "error": ProgressEvent<XMLHttpRequestEventTarget>;
		// "load": ProgressEvent<XMLHttpRequestEventTarget>;
		// "loadend": ProgressEvent<XMLHttpRequestEventTarget>;
		// "loadstart": ProgressEvent<XMLHttpRequestEventTarget>;
		// "progress": ProgressEvent<XMLHttpRequestEventTarget>;
		// "timeout": ProgressEvent<XMLHttpRequestEventTarget>;

		it('emits an event relative to the progress event type', () => {
			Xhr.ProgressEvents.filter(type => type !== 'abort').map(type => {
				const onEvent = vi.fn()

				xhr.on(type, onEvent)

				const event = new ProgressEvent(type, {
					loaded: 100,
					total: 200,
				}) as ProgressEvent<XMLHttpRequestEventTarget>

				xhr['onProgressChange'](event)

				if (type === 'error') {
					expect(onEvent).toHaveBeenCalledWith(
						expect.objectContaining(
							new Exception({
								message: 'ProgressEvent Error',
								code: ErrorCode.UNKNOWN,
								cause: event,
							}),
						),
						xhr,
					)
					return
				}

				expect(onEvent).toHaveBeenCalledWith(event, xhr)
			})

			const onAbort: XHR.Event.Listener<'abort'> = vi.fn()

			xhr.on('abort', onAbort).init().abort('Abort reason')

			expect(onAbort).toHaveBeenCalledWith(
				expect.objectContaining(new AbortError({ message: 'Abort reason' })),
				expect.objectContaining(new ProgressEvent('abort')),
				xhr,
			)
		})

		it('logs progress event data', () => {
			const log = vi.spyOn(xhr, 'log')

			const event = new ProgressEvent('load', {
				loaded: 100,
			}) as ProgressEvent<XMLHttpRequestEventTarget>

			xhr['onProgressChange'](event)

			expect(log).toHaveBeenCalledWith({
				event: event.type,
				message: `${event.loaded} bytes transferred.`,
			})
		})
	})

	describe('Xhr.log()', () => {
		it('logs messages when debug is enabled', () => {
			const xhr = new Xhr({ url, debug: true })
			const logSpy = vi.spyOn(console, 'log')

			xhr.log({ message: 'Test log' })

			expect(logSpy).toHaveBeenCalledWith({ class: 'Xhr', message: 'Test log' })
		})

		it("doesn't log messages when debug is disabled", () => {
			const xhr = new Xhr({ url, debug: false })
			const logSpy = vi.spyOn(console, 'log')

			xhr.log({ message: 'Test log' })

			expect(logSpy).not.toHaveBeenCalled()
		})
	})

	it('', () => {
		xhr.init().send()
		xhr.abort()
	})
})
