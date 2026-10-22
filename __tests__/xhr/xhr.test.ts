/**
 * @vitest-environment jsdom
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { Exception, ExceptionName } from '@alessiofrittoli/exception'
import { XMLHttpRequest } from '../__mocks__/XMLHttpRequest.mock'
import { AbortError } from '@alessiofrittoli/exception/abort'
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
		it('saves global preferences for future usage', () => {
			const xhr = new Xhr({
				autoResponseType: true,
				credentials: { username: 'username', password: 'password' },
				debug: true,
				timeout: 5000,
				withCredentials: true,
			})

			expect(xhr['autoResponseType']).toBe(true)
			expect(xhr.credentials).toEqual({ username: 'username', password: 'password' })
			expect(xhr.debug).toBe(true)
			expect(xhr.timeout).toBe(5000)
			expect(xhr.withCredentials).toBe(true)
		})

		it('provides timeout, credentials and withCredentials setters', () => {
			xhr['timeout'] = 20
			xhr['withCredentials'] = true
			xhr['credentials'] = {
				username: 'username',
				password: 'password',
			}

			expect(xhr.timeout).toBe(20)
			expect(xhr.withCredentials).toBe(true)
			expect(xhr.credentials).toEqual({
				username: 'username',
				password: 'password',
			})
		})
	})

	describe('Xhr.init()', () => {
		it('creates a new AbortController if no one is given', () => {
			xhr['init']({ url })

			expect(xhr.controller).toBeInstanceOf(AbortController)

			const abort = xhr.controller && vi.spyOn(xhr.controller, 'abort')

			xhr.abort('Testing abort.', { code: ErrorCode.TOO_MANY })

			expect(abort).toHaveBeenCalledExactlyOnceWith('Testing abort.', { code: ErrorCode.TOO_MANY })
		})

		it('uses the given AbortController', () => {
			const controller = new AbortController()

			const signalAddEventListener = vi.spyOn(controller.signal, 'addEventListener')
			const abort = vi.spyOn(controller, 'abort')

			xhr['init']({ url, controller })
			xhr.abort('Testing abort.', { code: ErrorCode.TOO_MANY })

			expect(signalAddEventListener).toHaveBeenCalledExactlyOnceWith('abort', expect.any(Function))

			expect(abort).toHaveBeenCalledExactlyOnceWith('Testing abort.', { code: ErrorCode.TOO_MANY })
		})

		it('creates a new AbortController if the previous one is aborted', () => {
			xhr['init']({ url })
			const oldController = xhr.controller
			xhr.abort('Testing abort.', { code: ErrorCode.TOO_MANY })

			xhr['init']({ url })

			expect(xhr.controller).not.toBe(oldController)
		})

		it('creates a new AbortController if the given one is aborted', () => {
			const controller = new AbortController()
			controller.abort()

			xhr['init']({ url, controller })

			expect(xhr.controller).not.toBe(controller)
		})

		it('initializes the XMLHttpRequest with the given credentials', () => {
			xhr['init']({ url, credentials: { username: 'username', password: 'password' } })

			expect(mockXMLHttpRequest.open).toHaveBeenCalledExactlyOnceWith(
				'GET',
				url,
				true,
				'username',
				'password',
			)
		})

		it('sets `timeout` to XMLHttpRequest with the given value', () => {
			expect(mockXMLHttpRequest.timeout).toBeUndefined()

			xhr['init']({ url, timeout: 5000 })

			expect(mockXMLHttpRequest.timeout).toBe(5000)
		})

		it('sets `withCredentials` to XMLHttpRequest with the given value', () => {
			expect(mockXMLHttpRequest.withCredentials).toBeUndefined()

			xhr['init']({ url, withCredentials: true })

			expect(mockXMLHttpRequest.withCredentials).toBe(true)
		})

		it('sets a newly generated request UUID', () => {
			xhr['init']({ url })
			const { requestId } = xhr
			expect(requestId).toBeDefined()
			xhr['init']({ url })
			expect(requestId).not.toBe(xhr.requestId)
		})

		it('sets custom request headers', () => {
			xhr['init']({ url, headers: { Authorization: 'Bearer token' } })

			expect(mockXMLHttpRequest.setRequestHeader).toHaveBeenCalledWith('authorization', 'Bearer token')
		})

		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr['init']({ url })).toThrow(xhr['getXhrNotAvailableError']())
		})
	})

	describe('Xhr.setRequestHeaders()', () => {
		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.setRequestHeaders({})).toThrow(xhr['getXhrNotAvailableError']())
		})

		it('sets the given headers to the XMLHttpRequest', () => {
			xhr.setRequestHeaders(
				new Headers({
					Authorization: 'Bearer token',
					'Content-Type': 'application/json',
				}),
			)

			expect(mockXMLHttpRequest.setRequestHeader).toHaveBeenNthCalledWith(
				1,
				'authorization',
				'Bearer token',
			)

			expect(mockXMLHttpRequest.setRequestHeader).toHaveBeenNthCalledWith(
				2,
				'content-type',
				'application/json',
			)
		})
	})

	describe('Xhr.getResponseHeader()', () => {
		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.getResponseHeader('Content-Type')).toThrow(xhr['getXhrNotAvailableError']())
		})

		it('gets response headers with the given key', () => {
			xhr.getResponseHeader('Content-Type')
			expect(mockXMLHttpRequest.getResponseHeader).toHaveBeenCalledWith('Content-Type')
		})
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

		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.send({ url })).toThrow(xhr['getXhrNotAvailableError']())
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

		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.upload({ url, files: [] })).toThrow(xhr['getXhrNotAvailableError']())
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

		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.abort()).toThrow(xhr['getXhrNotAvailableError']())
		})
	})

	describe('Xhr.getResponse()', () => {
		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() => xhr.getResponse()).toThrow(xhr['getXhrNotAvailableError']())
		})
	})

	describe('Xhr.destroy()', () => {
		it('aborts any network activity and remove event listeners', { todo: true })
	})

	describe('Xhr.error()', () => {
		it('throws the given error if there is no listener attached to the error event', () => {
			const error = new Exception({
				message: 'Thrown error',
				code: ErrorCode.XHR_NOT_AVAILABLE,
			})

			expect(() => xhr['error'](error)).toThrow(error)
		})

		it('emits an error event if there are listeners attached to the error event', () => {
			const error = new Exception({
				message: 'Thrown error',
				code: ErrorCode.XHR_NOT_AVAILABLE,
			})

			const onError = vi.fn()

			xhr.on('error', onError)

			expect(() => xhr['error'](error)).not.toThrow()
			expect(onError).toHaveBeenCalledExactlyOnceWith(error, xhr)
		})
	})

	describe('Xhr.log()', () => {
		it("doesn't print out infos if debug has been set to false", () => {
			const logSpy = vi.spyOn(console, 'log')

			xhr.log('Data')

			expect(logSpy).not.toHaveBeenCalled()
		})

		it('prints out given infos if debug has been set to true', () => {
			const xhr = new Xhr({ debug: true })
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

			xhr.log('Data')

			expect(logSpy).toHaveBeenCalled()
		})
	})

	describe.each([
		['Xhr.registerListeners()', 'registerListeners'],
		['Xhr.unregisterListeners()', 'unregisterListeners'],
	])('$0', (_, method) => {
		it('throws a new Exception if XMLHttpRequest is not available', () => {
			vi.stubGlobal('XMLHttpRequest', undefined)

			const xhr = new Xhr()

			expect(() =>
				// @ts-expect-error accessing a private method with dynamic value
				xhr[method](),
			).toThrow(xhr['getXhrNotAvailableError']())
		})
	})

	describe('Xhr ReadyState change events', () => {
		const tests: [XHR.Event.ReadyStateChange, number][] = [
			['headers', 2],
			['loading', 3],
			['done', 4],
		]

		it.each(tests)('emits "%s" event on readyState code "%s"', async event => {
			const eventHandler = vi.fn()
			xhr.once(event, eventHandler)

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(eventHandler).toHaveBeenCalled()
		})

		it('emits "success" event with server response', async () => {
			const onSuccess = vi.fn()

			xhr.on('success', onSuccess)

			const responseStatus = 200

			const responseBody = {
				message: 'Server success response message.',
			}

			mockXMLHttpRequest.getMockResponse.mockReturnValue({
				body: responseBody,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				status: responseStatus,
			})

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(onSuccess).toHaveBeenCalledWith(responseBody, xhr)
		})

		it.each([
			['text', undefined, 'no Content-Type'],
			['text', 'text/plain', 'Content-Type: text/plain'],
			['document', 'text/html', 'Content-Type: text/html'],
			['document', 'application/xml', 'Content-Type: application/xml'],
			['json', 'application/json', 'Content-Type: application/json'],
			['blob', 'image/png', 'Content-Type: image/*'],
			['blob', 'video/mp4', 'Content-Type: video/*'],
			['arraybuffer', 'application/x-bzip', 'an unhandled Content-Type'],
		])(
			'automatically sets the `responseType` to "$0" when $2 header is received',
			async (responseType, header, _condition) => {
				mockXMLHttpRequest.getMockResponse.mockReturnValue({
					body: {
						message: 'Server success response message.',
					},
					headers: header ? new Headers({ 'Content-Type': header }) : undefined,
					status: 200,
				})

				await new Promise(resolve => xhr.send({ url }).once('done', resolve))

				expect(xhr.request.responseType).toBe(responseType)
			},
		)

		it("doesn't automatically determine the response type if given", async () => {
			await new Promise(resolve => xhr.send({ url, responseType: 'arraybuffer' }).once('done', resolve))

			expect(xhr['autoResponseType']).toBe(false)
			expect(xhr.request.responseType).toBe('arraybuffer')
		})

		it('emits "done" and "error" events on bad HTTP status', async () => {
			const onDone = vi.fn()
			const onError = vi.fn()

			xhr.once('done', onDone)
			xhr.on('error', onError)

			const responseBody = {
				message: 'Server Response error message.',
			}
			const responseStatus = 400

			mockXMLHttpRequest.getMockResponse.mockReturnValue({
				body: responseBody,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				status: responseStatus,
			})

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(onDone).toHaveBeenCalled()
			expect(onError).toHaveBeenCalledWith(
				new Exception({
					message: 'Error from the server.',
					code: ErrorCode.UNKNOWN,
					status: responseStatus,
					cause: responseBody,
					isCritical: true,
				}),
				xhr,
			)
		})

		it('"error" events with the error returned by the server', async () => {
			const onError = vi.fn()

			xhr.on('error', onError)

			const responseStatus = 429

			const responseBody = new Exception({
				message: 'The error message returned by the server.',
				code: ErrorCode.TOO_MANY,
				status: responseStatus,
			})

			mockXMLHttpRequest.getMockResponse.mockReturnValue({
				body: responseBody,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				status: responseStatus,
			})

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(onError).toHaveBeenCalledWith(responseBody, xhr)
		})
	})

	describe('Xhr progress events', () => {
		it('emits "abort" event when "abort" progress event is received', async () => {
			const onAbort = vi.fn()

			xhr.once('loadstart', () => {
				xhr.abort('Abort reason.')
			}).once('abort', onAbort)

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(onAbort).toHaveBeenCalledWith(expect.any(AbortError), new ProgressEvent('abort'), xhr)
		})

		it('creates a new AbortError on abort if the current AbortController is lost for some reason', async () => {
			const controller = new AbortController()

			const onAbort = vi.fn()

			xhr.once('loadstart', () => {
				controller.abort()
			}).once('abort', onAbort)

			await new Promise(resolve => {
				xhr.send({ url, controller }).once('done', resolve)
				// @ts-expect-error negative testing
				xhr.controller = undefined
			})

			expect(onAbort).toHaveBeenCalledWith(
				new AbortError({ message: 'signal is aborted without reason', code: ErrorCode.ABORT }),
				new ProgressEvent('abort'),
				xhr,
			)
		})

		it('emits an "error" event when an "error" progress event is received', async () => {
			const onError = vi.fn()

			xhr.on('error', onError)

			mockXMLHttpRequest.getMockResponse.mockReturnValue({
				body: null,
				status: 400,
			})

			await new Promise(resolve => xhr.send({ url }).once('done', resolve))

			expect(onError).toHaveBeenCalled()
		})
	})
})
