import { binaryToString, stringToBinary } from '@alessiofrittoli/crypto-buffer'
import { Exception } from '@alessiofrittoli/exception'
import { ErrorCode } from '@/error'
import { fetch } from '@/fetch'
import { Fetch } from '@/types'


describe( 'fetch', () => {

	const mockFetch = jest.spyOn( globalThis, 'fetch' )

	afterEach( () => {
		mockFetch.mockReset()
	} )


	afterAll( () => {
		mockFetch.mockRestore()
	} )


	describe( 'JSON Responses', () => {

		it( 'returns parsed JSON data when response is ok and Content-Type is application/json', async () => {
	
			const headers		= new Headers( { 'Content-Type': 'application/json' } )
			const mockResponse	= (
				new Response( JSON.stringify( { message: true } ), { status: 200, headers } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<{ message: boolean }>( 'https://api.example.com' )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
			expect( result.data ).toEqual( { message: true } )
			expect( result.error ).toBeNull()
	
		} )
	
	
		it( 'returns parsed JSON data when response is ok and responseType is set to json', async () => {
	
			const mockResponse	= (
				new Response( JSON.stringify( { message: true } ), { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<{ message: boolean }>( 'https://api.example.com', { responseType: 'json' } )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', { responseType: 'json' } )
			expect( result.data ).toEqual( { message: true } )
			expect( result.error ).toBeNull()
	
		} )

	} )
	
	describe( 'FormData Responses', () => {

		it( 'returns parsed FormData when response is ok and Content-Type includes form-data', async () => {
	
			const body = new FormData()
			body.append( 'field-1', 'Field value' )
	
			const mockResponse	= (
				new Response( body, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<FormData>( 'https://api.example.com' )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
			expect( result.data?.get( 'field-1' ) ).toBe( 'Field value' )
			expect( result.error ).toBeNull()
	
		} )


		it( 'returns parsed FormData when response is ok and responseType is set to form-data', async () => {
	
			const body = new FormData()
			body.append( 'field-1', 'Field value' )
	
			const mockResponse	= (
				new Response( body, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<FormData>( 'https://api.example.com', { responseType: 'formdata' } )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', { responseType: 'formdata' } )
			expect( result.data?.get( 'field-1' ) ).toBe( 'Field value' )
			expect( result.error ).toBeNull()
	
		} )
		
	} )
	
	
	describe( 'ArrayBuffer Responses', () => {

		it( 'automatically parse ArrayBuffer to text data when response is ok and no responseType is set', async () => {

			const body = stringToBinary( 'ArrayBuffer text data' ).buffer
	
			const mockResponse	= (
				new Response( body as BodyInit, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<string>( 'https://api.example.com' )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
			expect( result.data ).toBe( 'ArrayBuffer text data' )
			expect( result.error ).toBeNull()
	
		} )


		it( 'returns parsed ArrayBuffer when response is ok and responseType is set to arraybuffer', async () => {
	
			const body = stringToBinary( 'ArrayBuffer text data' ).buffer
	
			const mockResponse	= (
				new Response( body as BodyInit, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<ArrayBuffer>( 'https://api.example.com', { responseType: 'arraybuffer' } )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', { responseType: 'arraybuffer' } )
			expect( result.data ).toBeInstanceOf( ArrayBuffer )
			expect( binaryToString( result.data! ) ).toBe( 'ArrayBuffer text data' )
			expect( result.error ).toBeNull()
	
		} )
		
	} )
	
	
	describe( 'Blob Responses', () => {

		it( 'automatically parse Blob to text data when response is ok and no responseType is set', async () => {

			const body = new Blob( [ stringToBinary( 'Blob text data' ) ] )
	
			const mockResponse	= (
				new Response( body, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<string>( 'https://api.example.com' )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
			expect( result.data ).toBe( 'Blob text data' )
			expect( result.error ).toBeNull()
	
		} )


		it( 'returns parsed Blob when response is ok and responseType is set to blob', async () => {

			// Base64-encoded 1x1 white PNG image
			const base64Image	= 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgkA+gKkZQAAAABJRU5ErkJggg=='
			const binary		= atob( base64Image )
			const array			= new Uint8Array( binary.length )

			for ( let i = 0; i < binary.length; i++ ) {
				array[ i ] = binary.charCodeAt( i )
			}
	
			const body = new Blob( [ array ], { type: 'image/png' } )
	
			const mockResponse	= (
				new Response( body, { status: 200 } )
			)
	
			mockFetch.mockResolvedValue( mockResponse )
	
			const result = await fetch<Blob>( 'https://api.example.com', { responseType: 'blob' } )
	
			expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', { responseType: 'blob' } )
			
			expect( result.data ).toBeInstanceOf( Blob )
			expect( result.data?.size ).toBe( 67 )
			expect( result.data?.type ).toBe( 'image/png' )
			expect( result.error ).toBeNull()
	
		} )
		
	} )


	it( 'returns text data when response is ok and no specific responseType is provided', async () => {

		const headers		= new Headers()
		const mockResponse	= (
			new Response( 'Success', { status: 200, headers } )
		)

		mockFetch.mockResolvedValue( mockResponse )

		const result = await fetch<string>( 'https://api.example.com' )

		expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
		expect( result.data ).toBe( 'Success' )
		expect( result.error ).toBeNull()

	} )


	it( 'returns an Exception when response is not ok and Content-Type is application/json', async () => {
		
		const headers		= new Headers( { 'Content-Type': 'application/json' } )
		const mockResponse	= (
			new Response(
				JSON.stringify( new Exception( 'Invalid request', { code: 0 } ) ), { status: 400, headers }
			)
		)

		mockFetch.mockResolvedValue( mockResponse )

		const result = await fetch( 'https://api.example.com' )

		expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
		expect( result.data ).toBeNull()
		expect( result.error ).toBeInstanceOf( Exception )
		expect( result.error?.message ).toBe( 'Invalid request' )

	} )


	it( 'returns an Exception when response is not ok and Content-Type is not application/json', async () => {

		const headers = new Headers()
		/**
		 * This error Response is typically received when an unhandled rejection occurs
		 * in the server business logic before an handled Response is returned.
		 */
		const mockResponse = (
			new Response(
				'', { status: 500, statusText: 'Internal Server Error', headers }
			)
		)

		mockFetch.mockResolvedValue( mockResponse )

		const result = await fetch( 'https://api.example.com' )

		expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
		expect( result.data ).toBeNull()
		expect( result.error ).toBeInstanceOf( Exception )
		expect( result.error?.message).toBe( 'Internal Server Error' )
		expect( result.error?.code ).toBe( ErrorCode.Exception.UNKNOWN )

	} )


	it( 'handles fetch errors and return an Exception with the original Error reference', async () => {

		const mockError = new TypeError( 'Failed to fetch', { cause: 'net::ERR_INTERNET_DISCONNECTED' } )
		mockFetch.mockRejectedValue( mockError )

		const result = await fetch( 'https://api.example.com' )

		expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
		expect( result.data ).toBeNull()
		expect( result.error ).toBeInstanceOf( Exception )
		expect( result.error?.message ).toBe( 'Failed to fetch' )
		expect( result.error?.code ).toBe( ErrorCode.Exception.UNKNOWN )
		expect( result.error?.cause ).toBe( mockError )

	} )


	it( 'calls the onfulfilled callback on success when provided', async () => {

		const headers		= new Headers( { 'Content-Type': 'application/json' } )
		const mockResponse	= (
			new Response( JSON.stringify( { message: true } ), { status: 200, headers } )
		)

		mockFetch.mockResolvedValue( mockResponse )

		const onfulfilled: Fetch.OnFulfilledCallback<{ custom: string }> = (
			jest.fn( response => ( {
				data	: { custom: 'data' },
				response: response,
				headers	: response.headers,
				error	: null,
			} ) )
		)
		const result = await fetch<{ custom: string }>(
			'https://api.example.com', undefined, onfulfilled
		)

		expect( mockFetch ).toHaveBeenCalledWith( 'https://api.example.com', undefined )
		expect( onfulfilled ).toHaveBeenCalledWith( mockResponse )
		expect( result.data ).toEqual( { custom: 'data' } )
	
	} )

} )