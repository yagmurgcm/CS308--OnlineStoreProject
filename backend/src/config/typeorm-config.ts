import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';

// DataSource used by TypeORM CLI for running migrations
const dataSource = new DataSource(getDatabaseConfig({ synchronize: false }));

export default dataSource;
