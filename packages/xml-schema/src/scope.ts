export type Scope<ParentT> = GlobalScope | LocalScope<ParentT>;

export interface GlobalScope {
    variety: 'global';
}

export interface LocalScope<ParentT> {
    variety: 'local';
    parent: ParentT | undefined;
}
