declare module 'dotenv-safe' {
	export interface DotenvSafeOptions {
		allowEmptyValues?: boolean;
		example?: string; // путь к .env.example
		path?: string;    // путь к .env
		sample?: string;  // alias для example в старых версиях
	}

	export function config(options?: DotenvSafeOptions): { parsed?: Record<string, string>; error?: Error } | void;
}
