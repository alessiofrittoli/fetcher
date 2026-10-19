/**
 * @vitest-environment jsdom
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { Exception, ExceptionName } from '@alessiofrittoli/exception'
import { XMLHttpRequest } from './__mocks__/XMLHttpRequest.mock'
import { ErrorCode } from '@/error'
import type { XHR } from '@/types'
import { Xhr } from '@/xhr'

const url = 'http://localhost:3000'

describe('Xhr - client', () => {
	let mockXMLHttpRequest: XMLHttpRequest
	let xhr: Xhr
	let mockXhrSend: Mock<<T = unknown>(options: XHR.Options) => Xhr<T>>

	beforeAll(() => {
		vi.useFakeTimers()
	})

	beforeEach(() => {
		// mock console.log implementation to avoid un-necessary `debug` logs
		// vi.spyOn(console, 'log').mockImplementation(() => {})

		mockXMLHttpRequest = new XMLHttpRequest()

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

		xhr = new Xhr()

		const originalSend = xhr.send

		mockXhrSend = vi.spyOn(xhr, 'send')

		mockXhrSend.mockImplementation(options => {
			originalSend.call(xhr, options)
			vi.runAllTimers()
			return xhr
		})
	})

	afterEach(() => {
		xhr.destroy()
		mockXMLHttpRequest.removeAllListeners()
		vi.clearAllTimers()
	})

	afterAll(() => {
		vi.useRealTimers()
	})

	describe('constructor', () => {
		it('saves global preferences for future usage', { todo: true })
	})

	describe('Xhr.init()', () => {
		it('uses the given AbortController', { todo: true })
		it('creates a new AbortController if no one is given', { todo: true })
		it('creates a new AbortController if the given one is already aborted', { todo: true })
	})

	describe('Xhr.send()', () => {
		it("automatically initializes if request hasn't been opened yet", async () => {
			const initSpy = vi.spyOn(xhr, 'init')

			xhr.send({ url })

			expect(initSpy).toHaveBeenCalled()
		})

		it('sends a XHR request with XMLHttpRequest', () => {
			xhr.send({ url })
			expect(mockXMLHttpRequest.send).toHaveBeenCalled()
		})

		// it('wraps the XMLHttpRequest.send() in a setTimeout so chained methods can immediately attach event listeners', async () => {
		// 	const setTimeout = vi.spyOn(global, 'setTimeout')
		// 	const onLoadStart = vi.fn()

		// 	// restore `xhr.send()` method original implementation so we can test the `.once()` event listener attached to it.
		// 	mockXhrSend.mockReset()

		// 	xhr.send({ url }).once('loadstart', onLoadStart)

		// 	expect(setTimeout).toHaveBeenCalledExactlyOnceWith(expect.any(Function))

		// 	vi.advanceTimersToNextFrame()

		// 	expect(onLoadStart).toHaveBeenCalledOnce()
		// })

		it('handles InvalidStateError on subsequent calls when request is not done', async () => {
			xhr.send({ url })

			const cause = new DOMException(
				"Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.",
				ExceptionName.InvalidStateError,
			)

			expect(() => xhr.send({ url })).toThrow(
				new Exception({
					...cause,
					name: cause.name,
					message: cause.message,
					code: ErrorCode.XHR_INVALID_STATE,
					isCritical: true,
					cause,
				}),
			)
		})
	})

	describe('Xhr.upload()', () => {
		it('sends a XHR request with given files', () => {
			const files = [new File([], 'filename'), new File([], 'filename-2')]

			xhr.upload({ url, files })

			const [[[file1Name], [file2Name]]] = mockXMLHttpRequest.send.mock.calls[0] as unknown as [
				FormData,
			]

			expect(mockXMLHttpRequest.send).toHaveBeenCalledWith(expect.any(FormData))

			expect(file1Name).toBe(files.at(0)?.name)
			expect(file2Name).toBe(files.at(1)?.name)
		})
	})

	describe('Xhr.abort()', () => {
		it('cancels any network activity', async () => {
			xhr.once('loadstart', () => {
				xhr.abort('Abort reason.')
			})

			xhr.send({ url })

			expect(mockXMLHttpRequest.abort).toHaveBeenCalled()
		})
	})

	describe('Xhr.destroy()', () => {
		it('aborts any network activity and remove event listeners', { todo: true })
	})
})
