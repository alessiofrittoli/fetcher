import type { Listener as EventEmitterListener } from '@alessiofrittoli/event-emitter'
import type { AbortController } from '@alessiofrittoli/abort-controller'
import type { AbortError } from '@alessiofrittoli/exception/abort'
import type { Exception } from '@alessiofrittoli/exception'
import type { UrlInput } from '@alessiofrittoli/url-utils'
import type { RequestMethod } from '@/types'
import type { ErrorCode } from '@/error'
import type { Xhr } from '.'

export namespace XHR {
	export type Method = RequestMethod

	export type ReadyState =
		| typeof XMLHttpRequest.UNSENT
		| typeof XMLHttpRequest.OPENED
		| typeof XMLHttpRequest.HEADERS_RECEIVED
		| typeof XMLHttpRequest.LOADING
		| typeof XMLHttpRequest.DONE

	export type Credentials = {
		/**
		 * The optional user name to use for authentication purposes.
		 *
		 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open#user)
		 */
		username?: string | null
		/**
		 * The optional user password to use for authentication purposes.
		 *
		 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open#password)
		 */
		password?: string | null
	}

	export namespace Event {
		export type Progress = keyof XMLHttpRequestEventTargetEventMap
		export type ReadyStateChange =
			'readystatechange' | 'unsent' | 'opened' | 'headers' | 'loading' | 'done'

		export type Map<TReturn = unknown> = {
			init: [xhr: Xhr<TReturn>]
			send: [xhr: Xhr<TReturn>]
			success: [response: TReturn | null | undefined, xhr: Xhr<TReturn>]
			error: [error: Exception<ErrorCode>, xhr: Xhr<TReturn>]
			abort: [
				reason: AbortError<ErrorCode>,
				event: ProgressEvent<XMLHttpRequestEventTarget>,
				xhr: Xhr<TReturn>,
			]
		} & {
			[event in ReadyStateChange]: [event: Event, xhr: Xhr<TReturn>]
		} & {
			[event in Exclude<XHR.Event.Progress, 'abort' | 'error'>]: [
				event: ProgressEvent<XMLHttpRequestEventTarget>,
				xhr: Xhr<TReturn>,
			]
		}

		export type Listener<
			TEvent extends keyof XHR.Event.Map<TReturn>,
			TReturn = unknown,
		> = EventEmitterListener<XHR.Event.Map<TReturn>, TEvent>
	}

	export interface ConstructOptions {
		/**
		 * Enables debug logging.
		 *
		 * @default false
		 */
		debug?: boolean
		/**
		 * Automatically set the `responseType` from Response Content-Type Header if set to `true` and `responseType` hasn't been set.
		 *
		 * @default true
		 */
		autoResponseType?: boolean
		/**
		 * The Xhr.withCredentials property is a boolean value that indicates whether or not cross-site Access-Control
		 * requests should be made using credentials such as cookies, authentication headers
		 * or TLS client certificates. Setting `withCredentials` has no effect on same-origin requests.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/withCredentials)
		 *
		 * @default false
		 */
		withCredentials?: XMLHttpRequest['withCredentials'] | null
		/**
		 * An object with `username` and `password` to send along with the request.
		 *
		 */
		credentials?: XHR.Credentials | null
		/**
		 * Can be set to a time in milliseconds. When set to a non-zero value will cause fetching to terminate after the given time has passed. When the time has passed, the request has not yet completed, and this's synchronous flag is unset, a timeout event will then be dispatched, or a "TimeoutError" DOMException will be thrown otherwise (for the send() method).
		 *
		 * When set: throws an "InvalidAccessError" DOMException if the synchronous flag is set and current global object is a Window object.
		 *
		 * @default 0
		 */
		timeout?: XMLHttpRequest['timeout'] | null
	}

	export interface InitOptions extends XHR.ConstructOptions {
		/**
		 * The URL string or URL object the request is made to.
		 *
		 */
		url: UrlInput
		/**
		 * The request method.
		 *
		 * @default 'GET'
		 */
		method?: RequestMethod
		/**
		 * The request HeadersInit object.
		 *
		 */
		headers?: Headers | HeadersInit
		/**
		 * A custom controller object that allows you to abort one or more DOM requests as and when desired.
		 *
		 */
		controller?: AbortController<ErrorCode>
		/**
		 * The expected Response Type.
		 *
		 */
		responseType?: XMLHttpRequestResponseType
	}

	export interface Options extends Omit<XHR.InitOptions, 'eventsTarget'> {
		/**
		 * The body object to send.
		 *
		 */
		body?: Document | XMLHttpRequestBodyInit
	}

	export interface UploadOptions extends Omit<XHR.Options, 'body'> {
		/**
		 * The HTMLInputElement `FileList` or an array of `File` to upload.
		 *
		 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/files)
		 */
		files: File[] | FileList
	}
}
