import type Emitter from '@alessiofrittoli/event-emitter'
import type { Exception } from '@alessiofrittoli/exception'
import type { AbortError } from '@alessiofrittoli/exception/abort'
import type { UrlInput } from '@alessiofrittoli/url-utils'
import type { AbortController } from '@alessiofrittoli/abort-controller'

import type { ErrorCode } from '@/error'
import type { Xhr } from '@/xhr'


export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'


export namespace Fetch
{
	export type Result<T> = {
		/** The received Response. */
		response: Response | null
		/** The received Response Headers. */
		headers	: Headers | null
	} & (
		{
			/** The parsed data. */
			data: T
			error: null
		} | {
			/** The parsed error. */
			error: Exception
			data: null
		}
	)
	
	
	export type ReturnDataType<T, U extends RequestInit = RequestInit> = (
		T extends undefined ? (
			U[ 'responseType' ] extends 'blob' ? Blob :
			U[ 'responseType' ] extends 'formdata' ? FormData :
			U[ 'responseType' ] extends 'arraybuffer' ? ArrayBuffer :
			string
		) : T
	)
	
	export type OnFulfilledCallback<V> = ( response: Response ) => Fetch.Result<V> | PromiseLike<Fetch.Result<V>>
}


export namespace XHR
{
	export namespace Event
	{
		export type Progress = keyof XMLHttpRequestEventTargetEventMap

		export type Map<TReturn = unknown> = {
			init	: [ xhr: Xhr<TReturn> ]
			send	: [ xhr: Xhr<TReturn> ]
			success	: [ response: TReturn, xhr: Xhr<TReturn> ]
			error	: [ error: Exception<string, ErrorCode>, xhr: Xhr<TReturn> ]
			abort	: [ reason: AbortError<string, ErrorCode>, event: ProgressEvent<XMLHttpRequestEventTarget>, xhr: Xhr<TReturn> ]
			readystatechange: [ event: Event, xhr: Xhr<TReturn> ]
		} & {
			[ event in Exclude<XHR.Event.Progress, 'abort' | 'error'> ]: [ event: ProgressEvent<XMLHttpRequestEventTarget>, xhr: Xhr<TReturn> ]
		}

		export type Listener<TEvent extends keyof XHR.Event.Map<TReturn>, TReturn = unknown> = (
			Emitter.Listener<XHR.Event.Map<TReturn>, TEvent>
		)
	}

	
	export interface InitOptions
	{
		/**
		 * A custom controller object that allows you to abort one or more DOM requests as and when desired.
		 */
		controller?: AbortController<ErrorCode>
	}


	export interface Options extends XHR.InitOptions
	{
		/** The URL string or URL object. */
		url: UrlInput
		/** The request method. Default: `GET`. */
		method?: RequestMethod
		/** The expected Response Type. */
		responseType?: XMLHttpRequestResponseType
		/** Automatically set the `responseType` from Response Content-Type Header if set to `true` and `responseType` hasn't been set. Default: `true`. */
		autoResponseType?: boolean
		/** The body object to send. */
		body?: Document | XMLHttpRequestBodyInit
		/** The request HeadersInit object. */
		headers?: Headers | HeadersInit
		/**
		 * True when credentials are to be included in a cross-origin request. False when they are to be excluded in a cross-origin request and when cookies are to be ignored in its response. Initially false.
		 * 
		 * When set: throws an "InvalidStateError" DOMException if state is not unsent or opened, or if the send() flag is set.
		 */
		withCredentials?: XMLHttpRequest[ 'withCredentials' ]
		/**
		 * An object with `username` and `password` to send along with the request.
		 * 
		 */
		credentials?: {
			username?: string | null
			password?: string | null
		}
		/**
		 * Can be set to a time in milliseconds. When set to a non-zero value will cause fetching to terminate after the given time has passed. When the time has passed, the request has not yet completed, and this's synchronous flag is unset, a timeout event will then be dispatched, or a "TimeoutError" DOMException will be thrown otherwise (for the send() method).
		 * 
		 * When set: throws an "InvalidAccessError" DOMException if the synchronous flag is set and current global object is a Window object.
		 */
		timeout?: XMLHttpRequest[ 'timeout' ]
		/** Whether to `console.log` data on different events. */
		debug?: boolean
	}
}