import type { AbortSignal } from '@alessiofrittoli/abort-controller'
import { Exception } from '@alessiofrittoli/exception'
import type { Fetch } from '@/types'
import { ErrorCode } from '@/error'

interface RequestInit extends globalThis.RequestInit {
	signal?: AbortSignal
}

/**
 * An extended version of the global fetch API.
 *
 * @param input			The RequestInfo | URL.
 * @param init			The RequestInit.
 * @param onfulfilled	(Optional) A callback to run on Request fulfill. This could be used to alter the returned result.
 * @returns	An object with the parsed Request data, Request error, Request Response instance and Request Headers.
 */
export const fetch = <T, U extends RequestInit = RequestInit, V = Fetch.ReturnDataType<T, U>>(
	input: RequestInfo | URL,
	init?: U,
	onfulfilled?: Fetch.OnFulfilledCallback<V>,
): Promise<Fetch.Result<V>> =>
	globalThis
		.fetch(input, init)
		.then(async response => {
			const headers = response.headers
			const contentType = headers.get('Content-Type')
			const parseJson = contentType?.includes('application/json') || init?.responseType === 'json'
			const parseFormData = contentType?.includes('form-data') || init?.responseType === 'formdata'

			const result: Fetch.Result<V> = { response, headers, data: null, error: null } as Fetch.Result<V>

			if (response.ok) {
				if (onfulfilled) {
					return onfulfilled(response)
				}

				if (parseJson) {
					result.data = await response.json<V>()
					return result
				}

				if (parseFormData) {
					result.data = (await response.formData()) as V
					return result
				}

				if (init?.responseType === 'arraybuffer') {
					result.data = (await response.arrayBuffer()) as V
					return result
				}

				if (init?.responseType === 'blob') {
					result.data = (await response.blob()) as V
					return result
				}

				result.data = (await response.text()) as V

				return result
			}

			if (parseJson) {
				/**
				 * Throw the received error JSON Response.
				 *
				 */
				throw await response.json()
			}

			result.error = new Exception({
				message: (await response.text()) || response.statusText,
				code: ErrorCode.UNKNOWN,
			})

			return result
		})
		.catch<Fetch.Result<V>>(err => {
			const error = Exception.isException(err)
				? new Exception(err)
				: new Exception({
						...err,
						name: err.name,
						message: err.message,
						code: ErrorCode.UNKNOWN,
						cause: err,
					})

			return {
				data: null,
				headers: null,
				response: null,
				error: error,
			}
		})
