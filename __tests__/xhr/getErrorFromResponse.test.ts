import { getErrorFromResponse } from '@/xhr/getErrorFromResponse'
import { Exception } from '@alessiofrittoli/exception'
import { describe, expect, it } from 'vitest'

const error = new Exception({
	message: 'Server Response Error.',
	code: 0,
})

describe('getErrorFromResponse', () => {
	// it.each([
	// 	[null, 'document'],
	// 	[null, 'json'],
	// ])('returns $0 if given responseType is $1', (result, responseType) => {})

	it('returns null if given responseType is document', async () => {
		await expect(
			getErrorFromResponse({
				response: '',
				responseType: 'document',
			}),
		).resolves.toBe(null)
	})

	it('returns a new Exception if given responseType is json and response is an Exception', async () => {
		await expect(
			getErrorFromResponse({
				response: error,
				responseType: 'json',
			}),
		).resolves.toEqual(error)
	})

	it('returns null if given responseType is json and response is not an Exception', async () => {
		await expect(
			getErrorFromResponse({
				response: JSON.stringify({}),
				responseType: 'json',
			}),
		).resolves.toBe(null)
	})

	it.each([
		[null, "''", ''],
		[null, 'text', ''],
		[null, 'arraybuffer', new ArrayBuffer()],
		[null, 'blob', new Blob()],
	])(
		'returns $0 if given responseType is $1 and no Exception is found in the response',
		async (result, responseType, response) => {
			await expect(
				getErrorFromResponse({
					response,
					responseType: responseType as XMLHttpRequestResponseType,
				}),
			).resolves.toBe(result)
		},
	)

	it.each([
		[null, "''", JSON.stringify({})],
		[null, 'text', JSON.stringify({})],
		[null, 'arraybuffer', Buffer.from(JSON.stringify({}))],
		[null, 'blob', new Blob([Buffer.from(JSON.stringify({}))])],
	])(
		'returns $0 if given responseType is $1 and no Exception is found in the JSON response',
		async (result, responseType, response) => {
			await expect(
				getErrorFromResponse({
					response,
					responseType: responseType as XMLHttpRequestResponseType,
				}),
			).resolves.toBe(result)
		},
	)

	it.each([
		[error, "''", JSON.stringify(error)],
		[error, 'text', JSON.stringify(error)],
		[error, 'arraybuffer', Buffer.from(JSON.stringify(error))],
		[error, 'blob', new Blob([Buffer.from(JSON.stringify(error))])],
	])(
		'returns the extracted Exception from the given response if given responseType is $1',
		async (result, responseType, response) => {
			await expect(
				getErrorFromResponse({
					response,
					responseType: responseType as XMLHttpRequestResponseType,
				}),
			).resolves.toEqual(result)
		},
	)
})
