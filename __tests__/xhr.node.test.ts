import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '@/error'
import type { XHR } from '@/types'
import { Xhr } from '@/xhr'

const url = 'https://example.com'

describe('Xhr - server', () => {
	let xhr: Xhr

	beforeEach(() => {
		xhr = new Xhr({ url })
	})

	afterEach(() => {
		xhr.removeAllListeners()
	})

	it('Xhr.request is null while running on server', () => {
		expect(xhr.request).toBe(null)
	})

	describe('Xhr.init()', () => {
		it('emits an error event if XMLHttpRequest is not available', () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			xhr.once('error', onError).init()

			expect(xhr['request']).toBeNull()
			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.send()', () => {
		it('emits an error event if XMLHttpRequest is not available', async () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			await xhr.once('error', onError).send()

			expect(xhr['request']).toBeNull()
			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.abort()', () => {
		it('emits an error event if XMLHttpRequest is not available', () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			xhr.once('error', onError).abort()

			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.addProgressListeners()', () => {
		it('emits an error event if XMLHttpRequest is not available', () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			xhr.once('error', onError)['addProgressListeners']()

			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.setHeaders()', () => {
		it('emits an error event if XMLHttpRequest is not available', () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			xhr.once('error', onError)['setHeaders']()

			expect(onError).toHaveBeenCalled()
		})
	})

	describe('Xhr.getResponse()', () => {
		it('emits an error event if XMLHttpRequest is not available', () => {
			const onError: XHR.Event.Listener<'error'> = vi.fn(error => {
				expect(error.code).toBe(ErrorCode.XHR_NOT_AVAILABLE)
			})

			xhr.once('error', onError).getResponse()

			expect(onError).toHaveBeenCalled()
		})
	})
})
