import type { AbortErrorOptions } from '@alessiofrittoli/exception/abort'
import { Exception, ExceptionName } from '@alessiofrittoli/exception'
import { AbortController } from '@alessiofrittoli/abort-controller'
import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { Url } from '@alessiofrittoli/url-utils'
import { ErrorCode } from '@/error'
import type { XHR } from '@/types'

/**
 * Easly handle XML HTTP Requests.
 *
 */
export class Xhr<TReturn = unknown> extends EventEmitter<XHR.Event.Map<TReturn>> implements XHR.Options {
	/** The XMLHttpRequest instance.  */
	public readonly request: XMLHttpRequest
	public readonly url
	public readonly method
	public readonly body
	public readonly headers
	public readonly credentials
	public readonly debug

	protected _response?: TReturn

	public get response(): typeof this._response {
		return this._response
	}
	protected set response(value: typeof this._response) {
		this._response = value
	}

	protected _controller: AbortController<ErrorCode>

	public get controller(): typeof this._controller {
		return this._controller
	}
	protected set controller(value: typeof this._controller) {
		this._controller = value
	}

	/** Indicates whether to automatically set the XHR response type based on the Response Content-Type Header. */
	private readonly setResponseType: boolean = false

	private static NotAvailableErr = new Exception({
		message: 'XMLHttpRequest not available',
		code: ErrorCode.XHR_NOT_AVAILABLE,
	})

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

	/**
	 * Construct a new instance of Xhr.
	 *
	 * @param options Required options for a proper initialization.
	 */
	public constructor(options: XHR.Options) {
		super({ captureRejections: true })

		this.request =
			typeof XMLHttpRequest !== 'undefined' // ensures no "Server Error"
				? new XMLHttpRequest()
				: (null as unknown as XMLHttpRequest)

		this.setResponseType = options.autoResponseType ?? true

		if (this.request) {
			if (typeof options.responseType !== 'undefined') {
				this.setResponseType = false
				this.request.responseType = options.responseType
			}
			if (typeof options.withCredentials !== 'undefined') {
				this.request.withCredentials = options.withCredentials
			}
			if (options.timeout) {
				this.request.timeout = options.timeout
			}
		}

		const { method = 'GET', controller = new AbortController(), debug = false } = options

		this.url = options.url
		this.method = method
		this.body = options.body
		this.headers = new Headers(options.headers)
		this.credentials = options.credentials
		this.debug = debug
		this._controller = controller
	}

	/**
	 * Initialise XMLHttpRequest.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public init(options: XHR.InitOptions = {}): this {
		if (!this.request) {
			return this.error(Xhr.NotAvailableErr)
		}

		if (options.controller) {
			this.controller = options.controller
		}

		if (this.controller.signal.aborted) {
			/**
			 * Create a new instance of `AbortController` if `Xhr.init()` get called again after aborting the request.
			 */
			this.controller = options.controller || new AbortController()
		}

		this.emit('init', this)
		this.addProgressListeners()
		this.request.open(
			this.method,
			Url.format(this.url),
			true,
			this.credentials?.username,
			this.credentials?.password,
		)
		this.setHeaders()

		this.request.removeEventListener('readystatechange', this.onReadyStateChange)
		this.request.addEventListener('readystatechange', this.onReadyStateChange)
		this.once('loadend', this.loadEndHandler)
		this.controller.signal.addEventListener('abort', this.onControllerSignalAbort)

		return this
	}

	/**
	 * Send XMLHttpRequest.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public async send(): Promise<this> {
		if (!this.request) {
			return this.error(Xhr.NotAvailableErr)
		}

		try {
			this.emit('send', this)
			await this.request.send(this.body)
			return this
		} catch (err) {
			const cause = err as Error

			const code =
				cause.name === ExceptionName.InvalidStateError
					? ErrorCode.XHR_INVALID_STATE
					: ErrorCode.UNKNOWN

			return this.error(
				new Exception({ ...cause, name: cause.name, message: cause.message, code, cause }),
			)
		}
	}

	/**
	 * Cancels any network activity.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	public abort(reason?: string, options?: AbortErrorOptions): this {
		if (!this.request) {
			return this.error(Xhr.NotAvailableErr)
		}

		this.controller.abort(reason, options)

		return this
	}

	/**
	 * Get formatted response.
	 *
	 * @returns The response text or an object from a json response.
	 */
	public getResponse(): TReturn | undefined {
		if (!this.request) {
			this.error(Xhr.NotAvailableErr)
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
	public getResponseContentType(): string | null {
		return this.getResponseHeader('Content-Type')
	}

	/**
	 * Get Response Header.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/getResponseHeader)
	 *
	 * @param	name The Header name.
	 * @returns	The Response Header value, `null` if none has been found.
	 */
	public getResponseHeader(name: string): string | null {
		return this.request.getResponseHeader(name)
	}

	/**
	 * Prints to `stdout` with newline.
	 *
	 * @param	data The data print out.
	 * @returns	The current `Xhr` instance for chaining purposes.
	 */
	// oxlint-disable-next-line typescript/no-explicit-any
	public log(data: Record<'message', string> & Record<string, any>): this {
		if (!this.debug) return this
		console.log({ class: 'Xhr', ...data })
		return this
	}

	/**
	 * Executed when `Xhr.controller` get aborted through `Xhr.abort()` or `Xhr.controller.abort()` methods.
	 *
	 */
	private onControllerSignalAbort = (): void => {
		this.controller.signal.removeEventListener('abort', this.onControllerSignalAbort)
		this.request.abort()
		this.log({ message: this.controller.signal.reason.message })
	}

	/**
	 * Handle `readystatechange` events.
	 *
	 * @param event The Event interface.
	 */
	private onReadyStateChange = async (event: Event): Promise<void> => {
		if (this.setResponseType) {
			this.setResponseTypeFromResponseHeaders()
		}

		if (this.debug) {
			const { logReadyStateChange } = await import('./logReadyStateChange')
			logReadyStateChange(this)
		}

		this.response = this.getResponse()
		this.emit('readystatechange', event, this)
	}

	/**
	 * Handle and emit progress events.
	 *
	 * See {@link Xhr.ProgressEvents} for a list of listened events.
	 *
	 * @param event The ProgressEvent interface.
	 */
	private onProgressChange = (event: ProgressEvent<XMLHttpRequestEventTarget>): this => {
		const eventType = event.type
		this.log({ event: eventType, message: `${event.loaded} bytes transferred.` })

		if (eventType === 'abort') {
			this.emit('abort', this.controller.signal.reason, event, this)
			return this
		}

		if (eventType === 'error') {
			return this.error(
				new Exception({
					message: 'ProgressEvent Error',
					code: ErrorCode.UNKNOWN,
					cause: event,
				}),
			)
		}

		this.emit(eventType, event, this)

		return this
	}

	/**
	 * Emit success or error events based on the received Response on Request Load End.
	 *
	 */
	private loadEndHandler = async (): Promise<this> => {
		const { status } = this.request

		if (status <= 0) {
			console.log({ statusIsZERO: true })

			/**
			 * If user abort the request by calling `Xhr.abort()` the `loadEndHandler` still get called.
			 *
			 */
			return this
		}

		try {
			if (status < 100 || status >= 400) {
				this.setResponseTypeFromResponseHeaders()

				// if (this.contentTypeToResponseType() === 'json' && Exception.isException(this.response)) {
				// 	return this.error(new Exception(this.response))
				// }

				const { response } = this
				const { responseType } = this.request

				const { getErrorFromResponse } = await import('./getErrorFromResponse')
				const error = await getErrorFromResponse({ response, responseType })

				if (error) return this.error(error)

				return this.error(
					new Exception({
						message: 'Error from the server.',
						code: ErrorCode.UNKNOWN,
						cause: this.response,
					}),
				)
			}

			return this.success()
		} catch (err) {
			const error = err as Error

			return this.error(new Exception({ code: ErrorCode.UNKNOWN, ...error }))
		}
	}

	/**
	 * Add listeners to the XMLHttpRequest instance.
	 *
	 * See {@link Xhr.ProgressEvents} for a list of listened events.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private addProgressListeners(): this {
		if (!this.request) {
			return this.error(Xhr.NotAvailableErr)
		}

		Xhr.ProgressEvents.map(event => {
			this.request.removeEventListener(event, this.onProgressChange)
			this.request.addEventListener(event, this.onProgressChange)
		})

		return this
	}

	/**
	 * Set the request headers.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private setHeaders(): this {
		if (!this.request) {
			return this.error(Xhr.NotAvailableErr)
		}

		Array.from(this.headers.entries()).forEach(([key, value]) => {
			this.request!.setRequestHeader(key, value)
		})

		return this
	}

	/**
	 * Convert MIME `Content-Type` to `XMLHttpRequestResponseType`.
	 *
	 * @param	contentType (Optional) The MIME `Content-Type`. Default: `Content-Type` Response Header.
	 * @returns	The `XMLHttpRequestResponseType` based on the given MIME `Content-Type`.
	 */
	private contentTypeToResponseType(contentType?: string | null): XMLHttpRequestResponseType {
		if (typeof contentType === 'undefined') {
			contentType = this.getResponseContentType()
		}
		if (!contentType) return ''

		contentType = contentType.toLowerCase()

		if (contentType.includes('text/html') || contentType.includes('application/xml')) {
			return 'document'
		}

		if (contentType.includes('application/json')) {
			return 'json'
		}

		if (contentType.includes('application/octet-stream')) {
			return 'arraybuffer'
		}

		if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
			return 'blob'
		}

		return 'text'
	}

	/**
	 * Automatically set `XMLHttpRequestResponseType` based on the received Response `Content-Type` Header.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private setResponseTypeFromResponseHeaders(): this {
		if (
			this.request.readyState === XMLHttpRequest.LOADING ||
			this.request.readyState === XMLHttpRequest.DONE
		) {
			return this
		}

		const contentType = this.getResponseContentType()
		this.request.responseType = this.contentTypeToResponseType(contentType)

		this.log({
			message: 'Set XMLHttpRequest.responseType from Content-Type Response Headers.',
			contentType: contentType,
			XhrResponseType: this.request.responseType,
		})

		return this
	}

	/**
	 * On success functions.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private success(): this {
		this.emit('success', this.response!, this)
		return this
	}

	/**
	 * On error functions.
	 *
	 * @returns The current `Xhr` instance for chaining purposes.
	 */
	private error(exception: Exception<ErrorCode>): this {
		this.emit('error', exception, this)
		return this
	}
}
