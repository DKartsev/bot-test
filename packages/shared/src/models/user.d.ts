export type User = {
    id: string;
    email: string;
    name: string;
};
export interface IUserRepo {
    findByEmail(email: string): Promise<User | null>;
    create(data: {
        email: string;
        name: string;
    }): Promise<User>;
    list(opts: {
        limit: number;
        cursor?: string;
    }): Promise<{
        items: User[];
        nextCursor?: string;
    }>;
}
//# sourceMappingURL=user.d.ts.map