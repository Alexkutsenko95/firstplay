import { createApp } from './app';
import { createPostgresStore } from './store';

export default createApp((env) => createPostgresStore(env.HYPERDRIVE.connectionString));
