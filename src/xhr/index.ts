import { AbortError, type AbortErrorOptions } from '@alessiofrittoli/exception/abort'
import { Exception, ExceptionName } from '@alessiofrittoli/exception'
import { AbortController } from '@alessiofrittoli/abort-controller'
import { randomUUID, type UUID } from '@alessiofrittoli/math-utils'
import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { Url } from '@alessiofrittoli/url-utils'
import { ErrorCode } from '@/error'
import type { XHR } from '@/types'

export class Xhr<TReturn = unknown> extends EventEmitter<XHR.Event.Map<TReturn>> {
	/**
	 * The XMLHttpRequest instance.
	 *
	 */
	public readonly request: XMLHttpRequest

	/**
	 * The current request UUID.
	 *
	 */
	protected _requestId: UUID = randomUUID()
	/**
	 * The current request UUID.
	 *
	 */
	public get requestId(): typeof this._requestId {
		return this._requestId
	}
	protected set requestId(value: typeof this._requestId) {
		this._requestId = value
	}

	/**
	 * Enables debug logging.
	 *
	 * @default false
	 */
	protected _debug
	/**
	 * Enables debug logging.
	 *
	 * @default false
	 */
	public get debug(): typeof this._debug {
		return this._debug
	}
	protected set debug(value: typeof this._debug) {
		this._debug = value
	}

	/**
	 * The AbortController used to cancel network activities.
	 *
	 */
	protected _controller?: AbortController<ErrorCode>
	/**
	 * The AbortController used to cancel network activities.
	 *
	 */
	public get controller(): typeof this._controller {
		return this._controller
	}
	protected set controller(value: typeof this._controller) {
		this._controller = value
	}

	/**
	 * The Xhr.timeout property is an unsigned long representing the number of milliseconds a request can take before
	 * automatically being terminated. The default value is 0, which means there is no timeout.
	 * When a timeout happens, a timeout event is fired.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/timeout)
	 *
	 * @default 0
	 */
	protected _timeout
	/**
	 * The Xhr.timeout property is an unsigned long representing the number of milliseconds a request can take before
	 * automatically being terminated. The default value is 0, which means there is no timeout.
	 * When a timeout happens, a timeout event is fired.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/timeout)
	 *
	 * @default 0
	 */
	public get timeout(): typeof this._timeout {
		return this._timeout
	}
	protected set timeout(value: typeof this._timeout) {
		this._timeout = value
	}

	/**
	 * An object with `username` and `password` to send along with the request.
	 *
	 */
	protected _credentials?: XHR.Credentials | null
	/**
	 * An object with `username` and `password` to send along with the request.
	 *
	 */
	public get credentials(): typeof this._credentials {
		return this._credentials
	}
	protected set credentials(value: typeof this._credentials) {
		this._credentials = value
	}

	/**
	 * The Xhr.withCredentials property is a boolean value that indicates whether or not cross-site Access-Control
	 * requests should be made using credentials such as cookies, authentication headers
	 * or TLS client certificates. Setting `withCredentials` has no effect on same-origin requests.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/withCredentials)
	 *
	 * @default false
	 */
	protected _withCredentials
	/**
	 * The Xhr.withCredentials property is a boolean value that indicates whether or not cross-site Access-Control
	 * requests should be made using credentials such as cookies, authentication headers
	 * or TLS client certificates. Setting `withCredentials` has no effect on same-origin requests.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/withCredentials)
	 *
	 * @default false
	 */
	public get withCredentials(): typeof this._withCredentials {
		return this._withCredentials
	}
	protected set withCredentials(value: typeof this._withCredentials) {
		this._withCredentials = value
	}

	/**
	 * Indicates whether to automatically set the XHR response type based on the Response Content-Type Header.
	 *
	 */
	private autoResponseType: boolean = false

	/**
	 * Indicates whther event listeners have been registered.
	 *
	 */
	private listenersRegistered: boolean = false

	/** XHR progress events. */
	public static readonly ProgressEvents: XHR.Event.Progress[] = [
		'abort',
		'timeout',
		'error',
		'loadstart',
		'progress',
		'load',
		'loadend',
	]

	private static MapReadyStateToXhrEvent: Record<XHR.ReadyState, XHR.Event.ReadyStateChange> = {
		0: 'unsent',
		1: 'opened',
		2: 'headers',
		3: 'loading',
		4: 'done',
	}

	/**
	 * Construct a new instance of Xhr.
	 *
	 * @param options Required options for a proper initialization.
	 */
	public constructor(options: XHR.ConstructOptions = {}) {
		super({ captureRejections: true })

		this.request =
			typeof XMLHttpRequest !== 'undefined' // ensures no "Server Error"
				? new XMLHttpRequest()
				: (null as unknown as XMLHttpRequest)

		const {
			credentials,
			withCredentials = false,
			timeout = 0,
			autoResponseType = true,
			debug = false,
		} = options

		this._debug = debug
		this._timeout = timeout
		this._withCredentials = withCredentials
		this._credentials = credentials
		this.autoResponseType = autoResponseType
	}

	/**
	 * Initialise XMLHttpRequest.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private init<T = TReturn>(options: XHR.InitOptions): Xhr<T> {
		if (!this.request) {
			return this.error<T>(this.getXhrNotAvailableError())
		}

		const {
			url,
			method = 'GET',
			headers,
			controller,
			debug = this.debug,
			timeout = this.timeout,
			withCredentials = this.withCredentials,
			credentials = this.credentials,
			responseType,
			autoResponseType = this.autoResponseType,
		} = options

		this.autoResponseType = autoResponseType
		this.requestId = randomUUID()
		this.debug = debug

		this.request.open(method, Url.format(url), true, credentials?.username, credentials?.password)

		this.request.timeout = timeout === null ? 0 : timeout
		this.request.withCredentials = withCredentials === null ? false : withCredentials

		if (typeof responseType !== 'undefined') {
			this.autoResponseType = false
			this.request.responseType = responseType
		}

		if (headers) {
			this.setRequestHeaders(headers)
		}

		this.setupAbortController(controller).registerListeners().emit('init', this)

		this.log('Xhr initialized.')

		return this as Xhr<T>
	}

	/**
	 * Send XMLHttpRequest.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public send<T = TReturn>(options: XHR.Options): Xhr<T> {
		if (!this.request) {
			return this.error<T>(this.getXhrNotAvailableError())
		}

		if (this.request.readyState !== XMLHttpRequest.OPENED) {
			this.init(options)
		}

		const { body } = options

		// send request in this scheduled task so anyone chained to `.send()` can listen events.
		try {
			this.emit('send', this)
			this.request.send(body)
			return this as Xhr<T>
		} catch (err) {
			const cause = err as Error

			const code =
				cause.name === ExceptionName.InvalidStateError
					? ErrorCode.XHR_INVALID_STATE
					: ErrorCode.UNKNOWN

			return this.error<T>(
				new Exception({
					...cause,
					name: cause.name,
					message: cause.message,
					code,
					cause,
					isCritical: true,
				}),
			)
		}
	}

	/**
	 * Upload files via XMLHttpRequest.
	 *
	 * Use `Xhr.request.upload` to listen upload events.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public upload<T = TReturn>(options: XHR.UploadOptions): Xhr<T> {
		const { files } = options

		const body = new FormData()

		Array.from(files).forEach(file => {
			body.append(file.name, file, file.name)
		})

		return this.send({ ...options, body })
	}

	/**
	 * Get formatted response.
	 *
	 * @returns The response text or an object from a json response.
	 */
	public getResponse<T = TReturn>(): T | null | undefined {
		if (!this.request) {
			this.error(this.getXhrNotAvailableError())
			return
		}

		return this.request.response
	}

	/**
	 * Cancels any network activity.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public abort<T = ErrorCode, U = TReturn>(reason?: string, options?: AbortErrorOptions<T>): Xhr<U> {
		if (!this.request) {
			return this.error<U>(this.getXhrNotAvailableError())
		}

		// Use the abort controller to abort the request so we can listen 1 single channel about abort requests.
		this.controller?.abort(reason, options as AbortErrorOptions<ErrorCode>)

		return this as Xhr<U>
	}

	/**
	 * Set the request headers.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public setRequestHeaders<T = TReturn>(headers: Headers | HeadersInit): Xhr<T> {
		if (!this.request) {
			return this.error<T>(this.getXhrNotAvailableError())
		}

		const _headers = new Headers(headers)

		Array.from(_headers.entries()).forEach(([key, value]) => {
			this.request.setRequestHeader(key, value)
		})

		return this as Xhr<T>
	}

	/**
	 * Get Response Header.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/getResponseHeader)
	 *
	 * @param	name The Header name.
	 * @returns	The Response Header value, `null` if none has been found.
	 */
	public getResponseHeader<T = TReturn>(name: string): string | null {
		if (!this.request) {
			this.error<T>(this.getXhrNotAvailableError())
			return null
		}

		return this.request.getResponseHeader(name)
	}

	/**
	 * Cancel any network activity an unregister all listeners.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public destroy<T = TReturn>(): Xhr<T> {
		return this.log<T>({ message: 'Xhr destroyed.' })
			.abort<ErrorCode, T>('Xhr has been destroyed.', {
				code: ErrorCode.XHR_DESTROYED,
			})
			.unregisterListeners<T>()
			.removeAllListeners()
	}

	/**
	 * Prints to `stdout` with newline.
	 *
	 * @param	data The data print out.
	 * @returns	The current `Xhr` instance for chaining purposes.
	 */
	// oxlint-disable-next-line typescript/no-explicit-any
	public log<T = TReturn>(...data: any[]): Xhr<T> {
		if (!this.debug) {
			return this as Xhr<T>
		}

		console.log({ class: 'Xhr', requestId: this.requestId }, ...data)

		return this as Xhr<T>
	}

	/**
	 * On success functions.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private success<T = TReturn>(response?: T): this {
		this.emit('success', response as unknown as TReturn, this)
		return this
	}

	/**
	 * On error functions.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private error<T = TReturn>(exception: Exception<ErrorCode>): Xhr<T> {
		if (this.listenerCount('error') === 0) {
			throw exception
		}

		this.emit('error', exception, this)

		return this as Xhr<T>
	}

	/**
	 * Get XMLHttpRequest not available error.
	 *
	 * @returns The newly created error with `ErrorCode.XHR_NOT_AVAILABLE` code.
	 */
	private getXhrNotAvailableError(): Exception<ErrorCode> {
		return new Exception({
			message: 'XMLHttpRequest not available.',
			code: ErrorCode.XHR_NOT_AVAILABLE,
			isCritical: true,
		})
	}

	private setupAbortController(controller?: XHR.InitOptions['controller']): this {
		const oldController = this.controller

		if (controller) {
			this.controller = controller
		}

		if (!this.controller || this.controller.signal.aborted) {
			/**
			 * Create a new instance of `AbortController` if `Xhr.init()` get called again after aborting the request.
			 *
			 */
			this.controller = new AbortController<ErrorCode>()
			this.log({ method: '.init()' }, 'new AbortController created.')
		}

		if (oldController !== this.controller) {
			this.log({ method: '.init()' }, 'Register AbortSignal "abort" event listener.')
			oldController?.signal.removeEventListener('abort', this.onControllerSignalAbort)
			this.controller.signal.addEventListener('abort', this.onControllerSignalAbort)
		}

		return this
	}

	//#region response type

	/**
	 * Automatically set `XMLHttpRequestResponseType` based on the received Response `Content-Type` Header.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private setResponseTypeFromResponseHeaders(): this {
		const contentType = this.getResponseContentType()
		this.request.responseType = this.contentTypeToResponseType(contentType)

		this.log(
			{
				method: '.setResponseTypeFromResponseHeaders()',
				contentType: contentType,
				XhrResponseType: this.request.responseType,
			},
			'Set XMLHttpRequest.responseType from Content-Type Response Headers.',
		)

		return this
	}

	/**
	 * Convert MIME `Content-Type` to `XMLHttpRequestResponseType`.
	 *
	 * @param	contentType (Optional) The MIME `Content-Type`. Default: `Content-Type` Response Header.
	 * @returns	The `XMLHttpRequestResponseType` based on the given MIME `Content-Type`.
	 */
	private contentTypeToResponseType(
		contentType: string | null = this.getResponseContentType(),
	): XMLHttpRequestResponseType {
		const _contentType = contentType?.toLowerCase() || false

		if (!_contentType || _contentType.includes('text/plain')) {
			return 'text'
		}

		if (_contentType.includes('text/html') || _contentType.includes('application/xml')) {
			return 'document'
		}

		if (_contentType.includes('application/json')) {
			return 'json'
		}

		if (_contentType.startsWith('image/') || _contentType.startsWith('video/')) {
			return 'blob'
		}

		return 'arraybuffer'
	}

	/**
	 * Get `Content-Type` Response Header.
	 *
	 * @returns The Response Header value, `null` if none has been found.
	 */
	public getResponseContentType(): string | null {
		return this.getResponseHeader('Content-Type')
	}

	//#endregion

	//#region events

	/**
	 * Handle `readystatechange` events.
	 *
	 * @param event The Event interface.
	 */
	private onReadyStateChange = async (event: Event): Promise<unknown> => {
		const { readyState, status } = this.request

		this.log({ event: `readystatechange`, readyState, status: this.request.status, data: event })

		if (this.autoResponseType && readyState === XMLHttpRequest.HEADERS_RECEIVED) {
			this.setResponseTypeFromResponseHeaders()
		}

		this.emit('readystatechange', event, this)

		if (readyState !== XMLHttpRequest.DONE) {
			return this.emitReadyStateEvent({ readyState, event })
		}

		if (status <= 0) {
			/**
			 * If user abort the request by calling `Xhr.abort()` the DONE event still get received.
			 *
			 */
			return this.emitReadyStateEvent({ readyState, event })
		}

		const response = this.getResponse()

		if (status < 100 || status >= 400) {
			const { responseType } = this.request

			const { getErrorFromResponse } = await import('./getErrorFromResponse')
			const error = await getErrorFromResponse({ response, responseType })

			this.emitReadyStateEvent({ readyState, event })

			if (error) {
				return this.error(error)
			}

			return this.error(
				new Exception({
					message: 'Error from the server.',
					code: ErrorCode.UNKNOWN,
					status: status,
					cause: response,
					isCritical: true,
				}),
			)
		}

		this.emitReadyStateEvent({ readyState, event })

		return this.success(response)
	}

	/**
	 * Handle and emit progress events.
	 *
	 * @param event The ProgressEvent interface.
	 */
	private onProgressChange = (event: ProgressEvent<XMLHttpRequestEventTarget>): unknown => {
		const { type } = event

		this.log(
			{ event: type, data: event, progress: (event.loaded / event.total) * 100 },
			`${event.loaded} bytes transferred.`,
		)

		if (type === 'abort') {
			const abortReason =
				this.controller?.signal.reason ||
				new AbortError({ message: 'The operation was aborted.', code: ErrorCode.ABORT })

			return this.emit('abort', abortReason, event, this)
		}

		if (type === 'error') {
			return this.error(
				new Exception({
					message: 'ProgressEvent Error',
					code: ErrorCode.UNKNOWN,
					cause: event,
					isCritical: true,
				}),
			)
		}

		this.emit(type, event, this)
	}

	/**
	 * Executed when `Xhr.controller` get aborted through `Xhr.abort()` or `Xhr.controller.abort()` methods.
	 *
	 */
	private onControllerSignalAbort = (): void => {
		this.log(
			{ method: '.onControllerSignalAbort()', reason: this.controller?.signal.reason },
			'Abort XHR request.',
		)
		this.controller?.signal.removeEventListener('abort', this.onControllerSignalAbort)
		this.request.abort()
	}

	/**
	 * Emit ReadyStateChange events.
	 *
	 */
	private emitReadyStateEvent({ readyState, event }: { readyState: number; event: Event }): this {
		const readyStateEvent = Xhr.MapReadyStateToXhrEvent[readyState as XHR.ReadyState]
		this.emit(readyStateEvent, event, this)

		this.log({
			event: `readystatechange:${readyStateEvent}`,
			readyState,
			status: this.request.status,
			data: event,
		})

		return this
	}

	/**
	 * Add listeners to the XMLHttpRequest instance.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private registerListeners<T = TReturn>(): Xhr<T> {
		if (!this.request) {
			return this.error<T>(this.getXhrNotAvailableError())
		}

		if (this.listenersRegistered) {
			return this as Xhr<T>
		}

		this.log({ method: '.registerListeners()' }, 'Register "readystatechange" event listener.')
		this.request.addEventListener('readystatechange', this.onReadyStateChange)

		Xhr.ProgressEvents.map(event => {
			this.log({ method: '.registerListeners()' }, `Register "${event}" event listener.`)
			this.request.addEventListener(event, this.onProgressChange)
		})

		this.listenersRegistered = true

		return this as Xhr<T>
	}

	/**
	 * Remove listeners attached to the XMLHttpRequest instance.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private unregisterListeners<T = TReturn>(): Xhr<T> {
		if (!this.request) {
			return this.error<T>(this.getXhrNotAvailableError())
		}

		if (!this.listenersRegistered) {
			return this as Xhr<T>
		}

		this.listenersRegistered = false

		this.log({ method: '.unregisterListeners()' }, 'Unregister "readystatechange" event listener.')
		this.request.removeEventListener('readystatechange', this.onReadyStateChange)

		Xhr.ProgressEvents.map(event => {
			this.log({ method: '.unregisterListeners()' }, `Unregister "${event}" event listener.`)
			this.request.removeEventListener(event, this.onProgressChange)
		})

		return this as Xhr<T>
	}

	//#endregion
}
