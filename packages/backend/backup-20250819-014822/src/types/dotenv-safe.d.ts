declare module "dotenv-safe" {
	export interface DotenvSafeOptions {
		allowEmptyValues?: boolean;
		example?: string;
		path?: string;
		sample?: string;
	}
	export function config(
		options?: DotenvSafeOptions
	): { parsed?: Record<string, string>; error?: Error } | void;
}
