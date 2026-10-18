/**
 * @vitest-environment jsdom
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { XMLHttpRequest } from './__mocks__/XMLHttpRequest.mock'
import { Xhr } from '@/xhr'

const url = 'http://localhost:3000'

describe('Xhr - client', () => {
	let mockXMLHttpRequest: XMLHttpRequest
	let xhr: Xhr

	beforeAll(() => {
		vi.useFakeTimers()
	})

	beforeEach(() => {
		// mock console.log implementation to avoid un-necessary `debug` logs
		vi.spyOn(console, 'log').mockImplementation(() => {})

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

		const mockXhrSend = vi.spyOn(xhr, 'send')

		mockXhrSend.mockImplementation(options => {
			originalSend.call(xhr, options)
			vi.advanceTimersToNextFrame()
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
		it("automatically initializes if request hasn't been opened yet", { todo: true })

		it('sends a XHR request with XMLHttpRequest', () => {
			xhr.send({ url })
			expect(mockXMLHttpRequest.send).toHaveBeenCalled()
		})

		it('wraps the XMLHttpRequest.send() in a setTimeout so chained methods can immediately attach event listeners', () => {
			const mockSetTimeout = vi.spyOn(global, 'setTimeout')
			xhr.send({ url })
			expect(mockSetTimeout).toHaveBeenCalledExactlyOnceWith(expect.any(Function))
		})
	})

	describe('Xhr.upload()', () => {
		it('sends a XHR request with given files', { todo: true })
	})

	describe('Xhr.abort()', () => {
		it('aborts any network activity', { todo: true })
	})

	describe('Xhr.destroy()', () => {
		it('aborts any network activity and remove event listeners', { todo: true })
	})
})
